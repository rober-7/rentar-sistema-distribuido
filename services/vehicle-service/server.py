"""Vehicle Service - microservicio gRPC de vehículos (Hito 2, Rentar).

Implementa las operaciones del dominio leyendo y escribiendo exclusivamente
su propia base PostgreSQL (tabla "vehiculos"). La disponibilidad temporal y
los estados derivados de reservas pertenecen a Rental Service.

El Gateway (NestJS) ya no tiene ningún provider con acceso directo a la tabla
"vehiculos": las 5 operaciones del ABM (listar, obtener, crear, actualizar,
dar de baja) y la consulta de disponibilidad pasan por acá vía gRPC.

ActualizarEstado está implementado y probado directamente por gRPC (no vía
Gateway, ver test manual en la sesión), pero hoy ningún endpoint del Gateway
lo invoca: tiene sentido recién cuando exista el Rental Service, que lo
llamaría al crear/cancelar una reserva. Ver nota en el método sobre la tensión
con el derive-on-read de estado.

Hito 3: al crear un vehículo se publica vehiculos.verificacion.solicitada y
el resultado (vehiculos.verificacion.resultado) llega de forma asíncrona por
RabbitMQ. La verificación se guarda en la columna "verificacion", separada del
estado operativo; un vehículo ROBADO deja de ofrecerse en disponibilidad y
Rental Service rechaza reservarlo.
"""

import os
import sys
from concurrent import futures

import grpc
from grpc_tools import protoc
from sqlalchemy import create_engine, text

PROTO_DIR = os.path.join(os.path.dirname(__file__), "proto")
GENERATED_DIR = os.path.join(os.path.dirname(__file__), "generated")


def compilar_proto() -> None:
    os.makedirs(GENERATED_DIR, exist_ok=True)
    open(os.path.join(GENERATED_DIR, "__init__.py"), "a").close()
    codigo = protoc.main(
        [
            "grpc_tools.protoc",
            f"-I{PROTO_DIR}",
            f"--python_out={GENERATED_DIR}",
            f"--grpc_python_out={GENERATED_DIR}",
            os.path.join(PROTO_DIR, "vehiculos.proto"),
        ]
    )
    if codigo != 0:
        raise RuntimeError("Fallo compilando vehiculos.proto")


compilar_proto()
sys.path.insert(0, GENERATED_DIR)

import vehiculos_pb2 as pb  # noqa: E402
import vehiculos_pb2_grpc as pb_grpc  # noqa: E402
from eventos import broker, contratos  # noqa: E402


def engine_desde_env():
    host = os.environ["DB_HOST"]
    port = os.environ.get("DB_PORT", "5432")
    user = os.environ["DB_USER"]
    password = os.environ["DB_PASSWORD"]
    name = os.environ["DB_NAME"]
    url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"
    return create_engine(url, pool_pre_ping=True)


def _fila_a_pb(v) -> pb.Vehiculo:
    vehiculo_pb = pb.Vehiculo()
    vehiculo_pb.id = v["id"]
    vehiculo_pb.patente = v["patente"]
    vehiculo_pb.marca = v["marca"]
    vehiculo_pb.modelo = v["modelo"]
    vehiculo_pb.anio = v["anio"]
    if v["color"] is not None:
        vehiculo_pb.color = v["color"]
    vehiculo_pb.tipo_vehiculo = pb.TipoVehiculo.Value(v["tipoVehiculo"])
    vehiculo_pb.precio_diario = float(v["precioDiario"])
    vehiculo_pb.estado = pb.EstadoVehiculo.Value(v["estado"])
    vehiculo_pb.activo = v["activo"]
    vehiculo_pb.creado_en = v["creadoEn"].isoformat()
    vehiculo_pb.actualizado_en = v["actualizadoEn"].isoformat()
    if v["verificacion"] is not None:
        vehiculo_pb.verificacion = pb.ResultadoVerificacion.Value(v["verificacion"])
    return vehiculo_pb


def _fila_externo_a_pb(v) -> pb.VehiculoExternoResponse:
    externo_pb = pb.VehiculoExternoResponse()
    externo_pb.id = v["id"]
    externo_pb.cliente_id = v["clienteId"]
    externo_pb.patente = v["patente"]
    externo_pb.marca = v["marca"]
    externo_pb.modelo = v["modelo"]
    externo_pb.anio = v["anio"]
    if v["color"] is not None:
        externo_pb.color = v["color"]
    externo_pb.tipo_vehiculo = pb.TipoVehiculo.Value(v["tipoVehiculo"])
    externo_pb.precio_diario = float(v["precioDiario"])
    externo_pb.estado = pb.EstadoVehiculoExterno.Value(v["estado"])
    externo_pb.creado_en = v["creadoEn"].isoformat()
    externo_pb.actualizado_en = v["actualizadoEn"].isoformat()
    return externo_pb


def _solicitar_verificacion(vehiculo_id: int, patente: str) -> None:
    # El vehículo ya quedó guardado: si el broker no está disponible no se
    # revierte el alta, la verificación queda pendiente y se vuelve a pedir
    # al reiniciar el servicio (ver _reintentar_verificaciones_pendientes).
    try:
        broker.publicar(
            contratos.VERIFICACION_SOLICITADA,
            {"vehiculoId": vehiculo_id, "patente": patente},
        )
    except Exception as error:  # noqa: BLE001
        print(
            f"[eventos] no se pudo solicitar la verificación de {patente} "
            f"({error!r}); queda pendiente",
            flush=True,
        )


def _reintentar_verificaciones_pendientes(engine) -> None:
    with engine.connect() as conn:
        pendientes = conn.execute(
            text("SELECT id, patente FROM vehiculos WHERE verificacion IS NULL")
        ).mappings().all()
    for v in pendientes:
        _solicitar_verificacion(v["id"], v["patente"])


def _registrar_resultado_verificacion(engine, payload: dict, _evento: dict) -> None:
    # Idempotente: recibir dos veces el mismo resultado deja el mismo valor.
    with engine.begin() as conn:
        fila = conn.execute(
            text(
                """
                UPDATE vehiculos
                SET verificacion = :resultado, "actualizadoEn" = now()
                WHERE id = :id AND patente = :patente
                RETURNING id
                """
            ),
            {
                "id": payload["vehiculoId"],
                "patente": payload["patente"],
                "resultado": payload["resultado"],
            },
        ).first()
    if fila is None:
        print(
            f"[eventos] resultado de verificación para vehículo "
            f"{payload['vehiculoId']} ({payload['patente']}) sin vehículo "
            f"correspondiente; se ignora",
            flush=True,
        )
        return
    print(
        f"[eventos] vehículo {payload['vehiculoId']} ({payload['patente']}) "
        f"verificado: {payload['resultado']}",
        flush=True,
    )


def _publicar_externo_registrado(
    vehiculo_externo_id: int, cliente_id: int, patente: str
) -> None:
    try:
        broker.publicar(
            contratos.EXTERNOS_REGISTRADOS,
            {
                "vehiculoExternoId": vehiculo_externo_id,
                "clienteId": cliente_id,
                "patente": patente,
            },
        )
    except Exception as error:  # noqa: BLE001
        print(
            f"[eventos] no se pudo publicar el registro del vehículo externo "
            f"{vehiculo_externo_id} ({patente}) ({error!r})",
            flush=True,
        )


def _completar_validacion_externo(engine, payload: dict, _evento: dict) -> None:
    vehiculo_externo_id = payload["vehiculoExternoId"]
    with engine.begin() as conn:
        externo = conn.execute(
            text(
                """
                SELECT id, "clienteId", patente, marca, modelo, anio, color,
                       "tipoVehiculo", "precioDiario", estado
                FROM vehiculos_externos
                WHERE id = :id
                FOR UPDATE
                """
            ),
            {"id": vehiculo_externo_id},
        ).mappings().first()

        if externo is None:
            print(
                f"[eventos] validación completada para vehículo externo "
                f"{vehiculo_externo_id} inexistente; se ignora",
                flush=True,
            )
            return

        conn.execute(
            text(
                """
                UPDATE vehiculos_externos
                SET estado = 'APROBADO', "actualizadoEn" = now()
                WHERE id = :id
                """
            ),
            {"id": vehiculo_externo_id},
        )

        conn.execute(
            text(
                """
                INSERT INTO vehiculos
                    (patente, marca, modelo, anio, color, "tipoVehiculo",
                     "precioDiario", estado, verificacion, activo,
                     "creadoEn", "actualizadoEn")
                VALUES
                    (:patente, :marca, :modelo, :anio, :color, :tipo_vehiculo,
                     :precio_diario, 'DISPONIBLE', 'VALIDADO', true,
                     now(), now())
                ON CONFLICT (patente) DO NOTHING
                """
            ),
            {
                "patente": externo["patente"],
                "marca": externo["marca"],
                "modelo": externo["modelo"],
                "anio": externo["anio"],
                "color": externo["color"],
                "tipo_vehiculo": externo["tipoVehiculo"],
                "precio_diario": externo["precioDiario"],
            },
        )

    print(
        f"[eventos] vehículo externo {vehiculo_externo_id} "
        f"({externo['patente']}) aprobado e incorporado como DISPONIBLE",
        flush=True,
    )


class VehiculoServiceServicer(pb_grpc.VehiculoServiceServicer):
    def __init__(self, engine):
        self.engine = engine

    def ListarVehiculos(self, request, context):
        print("[gRPC] ListarVehiculos invocado por el Gateway", flush=True)
        with self.engine.connect() as conn:
            vehiculos = conn.execute(
                text(
                    """
                    SELECT id, patente, marca, modelo, anio, color,
                           "tipoVehiculo", "precioDiario", estado, activo,
                           verificacion, "creadoEn", "actualizadoEn"
                    FROM vehiculos
                    """
                )
            ).mappings().all()
        respuesta = pb.ListarVehiculosResponse()
        for v in vehiculos:
            respuesta.vehiculos.append(_fila_a_pb(v))
        return respuesta

    def ObtenerVehiculo(self, request, context):
        print(
            f"[gRPC] ObtenerVehiculo({request.id}) invocado por el Gateway",
            flush=True,
        )
        with self.engine.connect() as conn:
            v = conn.execute(
                text(
                    """
                    SELECT id, patente, marca, modelo, anio, color,
                           "tipoVehiculo", "precioDiario", estado, activo,
                           verificacion, "creadoEn", "actualizadoEn"
                    FROM vehiculos
                    WHERE id = :id
                    """
                ),
                {"id": request.id},
            ).mappings().first()

            if v is None:
                context.abort(
                    grpc.StatusCode.NOT_FOUND,
                    f"No existe un vehículo con id {request.id}",
                )

            return _fila_a_pb(v)

    def FiltrarVehiculos(self, request, context):
        print(
            "[gRPC] FiltrarVehiculos invocado por el Gateway",
            flush=True,
        )
        # Un vehículo denunciado como robado queda inhabilitado: no se ofrece
        # en la consulta de disponibilidad. Los pendientes sí se ofrecen.
        condiciones = ["activo = true", "verificacion IS DISTINCT FROM 'ROBADO'"]
        parametros = {}

        if request.HasField("tipo_vehiculo"):
            condiciones.append('"tipoVehiculo" = :tipo_vehiculo')
            parametros["tipo_vehiculo"] = pb.TipoVehiculo.Name(
                request.tipo_vehiculo
            )
        if request.HasField("marca"):
            condiciones.append("marca ILIKE :marca")
            parametros["marca"] = f"%{request.marca}%"
        if request.HasField("modelo"):
            condiciones.append("modelo ILIKE :modelo")
            parametros["modelo"] = f"%{request.modelo}%"
        if request.HasField("precio_minimo"):
            condiciones.append('"precioDiario" >= :precio_minimo')
            parametros["precio_minimo"] = request.precio_minimo
        if request.HasField("precio_maximo"):
            condiciones.append('"precioDiario" <= :precio_maximo')
            parametros["precio_maximo"] = request.precio_maximo

        sql = f"""
            SELECT id, patente, marca, modelo, anio, color,
                   "tipoVehiculo", "precioDiario", estado, activo,
                   verificacion, "creadoEn", "actualizadoEn"
            FROM vehiculos
            WHERE {' AND '.join(condiciones)}
        """

        with self.engine.connect() as conn:
            vehiculos = conn.execute(text(sql), parametros).mappings().all()

        respuesta = pb.ListarVehiculosResponse()
        for v in vehiculos:
            respuesta.vehiculos.append(_fila_a_pb(v))
        return respuesta

    def ActualizarEstado(self, request, context):
        print(
            f"[gRPC] ActualizarEstado({request.id} -> "
            f"{pb.EstadoVehiculo.Name(request.estado)}) invocado",
            flush=True,
        )
        nuevo_estado = pb.EstadoVehiculo.Name(request.estado)
        with self.engine.begin() as conn:
            v = conn.execute(
                text(
                    """
                    UPDATE vehiculos
                    SET estado = :estado, "actualizadoEn" = now()
                    WHERE id = :id
                    RETURNING id, patente, marca, modelo, anio, color,
                              "tipoVehiculo", "precioDiario", estado, activo,
                              verificacion, "creadoEn", "actualizadoEn"
                    """
                ),
                {"id": request.id, "estado": nuevo_estado},
            ).mappings().first()

        if v is None:
            context.abort(
                grpc.StatusCode.NOT_FOUND,
                f"No existe un vehículo con id {request.id}",
            )
        return _fila_a_pb(v)

    def CrearVehiculo(self, request, context):
        print(
            f"[gRPC] CrearVehiculo({request.patente}) invocado por el Gateway",
            flush=True,
        )
        with self.engine.begin() as conn:
            existente = conn.execute(
                text("SELECT 1 FROM vehiculos WHERE patente = :patente"),
                {"patente": request.patente},
            ).first()
            if existente is not None:
                context.abort(
                    grpc.StatusCode.ALREADY_EXISTS,
                    f"Ya existe un vehículo con la patente {request.patente}",
                )

            v = conn.execute(
                text(
                    """
                    INSERT INTO vehiculos
                        (patente, marca, modelo, anio, color, "tipoVehiculo",
                         "precioDiario", estado, activo, "creadoEn", "actualizadoEn")
                    VALUES
                        (:patente, :marca, :modelo, :anio, :color, :tipo_vehiculo,
                         :precio_diario, 'DISPONIBLE', true, now(), now())
                    RETURNING id, patente, marca, modelo, anio, color,
                              "tipoVehiculo", "precioDiario", estado, activo,
                              verificacion, "creadoEn", "actualizadoEn"
                    """
                ),
                {
                    "patente": request.patente,
                    "marca": request.marca,
                    "modelo": request.modelo,
                    "anio": request.anio,
                    "color": request.color if request.HasField("color") else None,
                    "tipo_vehiculo": pb.TipoVehiculo.Name(request.tipo_vehiculo),
                    "precio_diario": request.precio_diario,
                },
            ).mappings().first()

        # Se publica después del commit: el Gateway recibe la respuesta sin
        # esperar la verificación, que llega más tarde por RabbitMQ.
        _solicitar_verificacion(v["id"], v["patente"])
        return _fila_a_pb(v)

    def ActualizarVehiculo(self, request, context):
        print(
            f"[gRPC] ActualizarVehiculo({request.id}) invocado por el Gateway",
            flush=True,
        )
        # La patente nunca se modifica (no está en el request). Para "color",
        # protobuf optional no distingue "ausente" de "null": usamos la
        # convención de que un string vacío presente ("") limpia la columna a
        # NULL, mientras que el campo ausente significa "no tocar".
        sets = ['"actualizadoEn" = now()']
        parametros: dict = {"id": request.id}

        if request.HasField("marca"):
            sets.append("marca = :marca")
            parametros["marca"] = request.marca
        if request.HasField("modelo"):
            sets.append("modelo = :modelo")
            parametros["modelo"] = request.modelo
        if request.HasField("anio"):
            sets.append("anio = :anio")
            parametros["anio"] = request.anio
        if request.HasField("color"):
            sets.append("color = :color")
            parametros["color"] = request.color or None
        if request.HasField("tipo_vehiculo"):
            sets.append('"tipoVehiculo" = :tipo_vehiculo')
            parametros["tipo_vehiculo"] = pb.TipoVehiculo.Name(
                request.tipo_vehiculo
            )
        if request.HasField("precio_diario"):
            sets.append('"precioDiario" = :precio_diario')
            parametros["precio_diario"] = request.precio_diario
        if request.HasField("activo"):
            sets.append("activo = :activo")
            parametros["activo"] = request.activo

        sql = f"""
            UPDATE vehiculos
            SET {', '.join(sets)}
            WHERE id = :id
            RETURNING id, patente, marca, modelo, anio, color,
                      "tipoVehiculo", "precioDiario", estado, activo,
                      verificacion, "creadoEn", "actualizadoEn"
        """

        with self.engine.begin() as conn:
            v = conn.execute(text(sql), parametros).mappings().first()
            if v is None:
                context.abort(
                    grpc.StatusCode.NOT_FOUND,
                    f"No existe un vehículo con id {request.id}",
                )
        return _fila_a_pb(v)

    def RegistrarVehiculoExterno(self, request, context):
        print(
            f"[gRPC] RegistrarVehiculoExterno({request.patente}, "
            f"cliente={request.cliente_id}) invocado por el Gateway",
            flush=True,
        )
        with self.engine.begin() as conn:
            existente_vehiculo = conn.execute(
                text("SELECT 1 FROM vehiculos WHERE patente = :patente"),
                {"patente": request.patente},
            ).first()
            if existente_vehiculo is not None:
                context.abort(
                    grpc.StatusCode.ALREADY_EXISTS,
                    f"Ya existe un vehículo con la patente {request.patente}",
                )

            existente_externo = conn.execute(
                text(
                    """
                    SELECT 1 FROM vehiculos_externos
                    WHERE patente = :patente AND estado IN ('PENDIENTE', 'APROBADO')
                    """
                ),
                {"patente": request.patente},
            ).first()
            if existente_externo is not None:
                context.abort(
                    grpc.StatusCode.ALREADY_EXISTS,
                    f"Ya existe una solicitud en trámite o aprobada para la patente {request.patente}",
                )

            ve = conn.execute(
                text(
                    """
                    INSERT INTO vehiculos_externos
                        ("clienteId", patente, marca, modelo, anio, color,
                         "tipoVehiculo", "precioDiario", estado,
                         "creadoEn", "actualizadoEn")
                    VALUES
                        (:cliente_id, :patente, :marca, :modelo, :anio, :color,
                         :tipo_vehiculo, :precio_diario, 'PENDIENTE',
                         now(), now())
                    RETURNING id, "clienteId", patente, marca, modelo, anio, color,
                              "tipoVehiculo", "precioDiario", estado,
                              "creadoEn", "actualizadoEn"
                    """
                ),
                {
                    "cliente_id": request.cliente_id,
                    "patente": request.patente,
                    "marca": request.marca,
                    "modelo": request.modelo,
                    "anio": request.anio,
                    "color": request.color if request.HasField("color") else None,
                    "tipo_vehiculo": pb.TipoVehiculo.Name(request.tipo_vehiculo),
                    "precio_diario": request.precio_diario,
                },
            ).mappings().first()

        _publicar_externo_registrado(ve["id"], ve["clienteId"], ve["patente"])
        return _fila_externo_a_pb(ve)


def main():
    engine = engine_desde_env()
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    pb_grpc.add_VehiculoServiceServicer_to_server(
        VehiculoServiceServicer(engine), server
    )
    puerto = os.environ.get("GRPC_PORT", "50051")
    server.add_insecure_port(f"[::]:{puerto}")
    print(f"Vehicle Service escuchando en puerto {puerto}", flush=True)
    server.start()

    broker.escuchar(
        contratos.COLA_VEHICULOS_VERIFICACION,
        {
            contratos.VERIFICACION_RESULTADO: lambda payload, evento: (
                _registrar_resultado_verificacion(engine, payload, evento)
            )
        },
    )
    broker.escuchar(
        contratos.COLA_VEHICULOS_EXTERNOS_COMPLETADA,
        {
            contratos.EXTERNOS_VALIDACION_COMPLETADA: lambda payload, evento: (
                _completar_validacion_externo(engine, payload, evento)
            )
        },
    )
    _reintentar_verificaciones_pendientes(engine)
    server.wait_for_termination()


if __name__ == "__main__":
    main()
