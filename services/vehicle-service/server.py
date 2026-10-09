"""Vehicle Service - microservicio gRPC de vehículos (Hito 2, Rentar).

Implementa las 4 operaciones del contrato (ListarVehiculos, ObtenerVehiculo,
ConsultarDisponibilidad, ActualizarEstado) leyendo/escribiendo directamente la
base Postgres compartida (tablas "vehiculos" y "reservas").

ListarVehiculos, ObtenerVehiculo y ConsultarDisponibilidad están migrados de
punta a punta: el Gateway (NestJS) los llama por gRPC en vez de resolverlos
localmente contra la DB.

ActualizarEstado está implementado y probado directamente por gRPC (no vía
Gateway, ver test manual en la sesión), pero hoy ningún endpoint del Gateway
lo invoca: tiene sentido recién cuando exista el Rental Service, que lo
llamaría al crear/cancelar una reserva. Ver nota en el método sobre la tensión
con el derive-on-read de estado.
"""

import os
import sys
from concurrent import futures
from datetime import datetime, timezone

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


def engine_desde_env():
    host = os.environ["DB_HOST"]
    port = os.environ.get("DB_PORT", "5432")
    user = os.environ["DB_USER"]
    password = os.environ["DB_PASSWORD"]
    name = os.environ["DB_NAME"]
    url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"
    return create_engine(url, pool_pre_ping=True)


def _derivar_estados(conn, vehiculo_ids: list[int]) -> dict[int, str]:
    """Deriva DISPONIBLE/RESERVADO/EN_ALQUILER según las reservas CONFIRMADAS
    vigentes de cada vehículo (misma regla que antes vivía en VehiculosService
    del Gateway)."""
    if not vehiculo_ids:
        return {}

    reservas_vigentes = conn.execute(
        text(
            """
            SELECT vehiculo_id, "fechaInicio"
            FROM reservas
            WHERE activo = true
              AND estado = 'CONFIRMADA'
              AND "fechaFinalizacion" > now()
              AND vehiculo_id = ANY(:ids)
            """
        ),
        {"ids": vehiculo_ids},
    ).mappings().all()

    inicios_por_vehiculo: dict[int, list[datetime]] = {}
    for r in reservas_vigentes:
        inicios_por_vehiculo.setdefault(r["vehiculo_id"], []).append(
            r["fechaInicio"]
        )

    ahora = datetime.now(timezone.utc)
    estados: dict[int, str] = {}
    for vid in vehiculo_ids:
        inicios = inicios_por_vehiculo.get(vid, [])
        if any(i <= ahora for i in inicios):
            estados[vid] = "EN_ALQUILER"
        elif inicios:
            estados[vid] = "RESERVADO"
        else:
            estados[vid] = "DISPONIBLE"
    return estados


def _fila_a_pb(v, estado_derivado: str) -> pb.Vehiculo:
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
    vehiculo_pb.estado = pb.EstadoVehiculo.Value(estado_derivado)
    vehiculo_pb.activo = v["activo"]
    vehiculo_pb.creado_en = v["creadoEn"].isoformat()
    vehiculo_pb.actualizado_en = v["actualizadoEn"].isoformat()
    return vehiculo_pb


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
                           "creadoEn", "actualizadoEn"
                    FROM vehiculos
                    """
                )
            ).mappings().all()
            estados = _derivar_estados(conn, [v["id"] for v in vehiculos])

        respuesta = pb.ListarVehiculosResponse()
        for v in vehiculos:
            respuesta.vehiculos.append(_fila_a_pb(v, estados[v["id"]]))
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
                           "creadoEn", "actualizadoEn"
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

            estado = _derivar_estados(conn, [v["id"]])[v["id"]]
            return _fila_a_pb(v, estado)

    def ConsultarDisponibilidad(self, request, context):
        print(
            "[gRPC] ConsultarDisponibilidad invocado por el Gateway",
            flush=True,
        )
        condiciones = [
            "activo = true",
            """NOT EXISTS (
                SELECT 1 FROM reservas r
                WHERE r.vehiculo_id = vehiculos.id
                  AND r.activo = true
                  AND r.estado = 'CONFIRMADA'
                  AND r."fechaInicio" < :fecha_fin
                  AND r."fechaFinalizacion" > :fecha_inicio
            )""",
        ]
        parametros = {
            "fecha_inicio": request.fecha_inicio,
            "fecha_fin": request.fecha_finalizacion,
        }

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
                   "creadoEn", "actualizadoEn"
            FROM vehiculos
            WHERE {' AND '.join(condiciones)}
        """

        with self.engine.connect() as conn:
            vehiculos = conn.execute(text(sql), parametros).mappings().all()

        # Todos los vehículos que llegan hasta acá ya están filtrados como
        # disponibles en el período (no tienen reservas CONFIRMADA solapadas).
        respuesta = pb.ListarVehiculosResponse()
        for v in vehiculos:
            respuesta.vehiculos.append(_fila_a_pb(v, "DISPONIBLE"))
        return respuesta

    def ActualizarEstado(self, request, context):
        # NOTA para quien construya el Rental Service: hoy ListarVehiculos y
        # ObtenerVehiculo IGNORAN esta columna persistida y recalculan el
        # estado leyendo "reservas" en cada lectura (_derivar_estados). Este
        # RPC persiste igual porque el contrato lo pide, pero mientras ese
        # derive-on-read siga existiendo, lo que escriba acá se pisa en la
        # próxima consulta. Cuando Rental Service exista y sea el dueño de
        # "reservas", probablemente convenga que Vehicle Service deje de leer
        # esa tabla directamente y confíe en este campo persistido (que
        # Rental Service actualizaría vía este mismo RPC al crear/cancelar
        # una reserva).
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
                              "creadoEn", "actualizadoEn"
                    """
                ),
                {"id": request.id, "estado": nuevo_estado},
            ).mappings().first()

        if v is None:
            context.abort(
                grpc.StatusCode.NOT_FOUND,
                f"No existe un vehículo con id {request.id}",
            )
        return _fila_a_pb(v, v["estado"])


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
    server.wait_for_termination()


if __name__ == "__main__":
    main()
