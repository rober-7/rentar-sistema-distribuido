"""Rental Service: microservicio gRPC para Reservas e historial de alquiler. (Hito 2, Punto 4)

Gestiona exclusivamente su propia base PostgreSQL (tabla "reservas"). Para
validar clientes y vehículos consume Customer Service y Vehicle Service por
gRPC; nunca lee tablas de otros dominios.
"""

import math
import os
import sys
from concurrent import futures
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

import grpc
from grpc_tools import protoc
from pika.exceptions import AMQPError
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

from eventos import broker, contratos

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
            os.path.join(PROTO_DIR, "reservas.proto"),
            os.path.join(PROTO_DIR, "clientes.proto"),
            os.path.join(PROTO_DIR, "vehiculos.proto"),
        ]
    )
    if codigo != 0:
        raise RuntimeError("Fallo compilando reservas.proto")


compilar_proto()
sys.path.insert(0, GENERATED_DIR)

import reservas_pb2 as pb  # noqa: E402
import reservas_pb2_grpc as pb_grpc  # noqa: E402
import clientes_pb2  # noqa: E402
import clientes_pb2_grpc  # noqa: E402
import vehiculos_pb2  # noqa: E402
import vehiculos_pb2_grpc  # noqa: E402


def engine_desde_env():
    host = os.environ["DB_HOST"]
    port = os.environ.get("DB_PORT", "5432")
    user = os.environ["DB_USER"]
    password = os.environ["DB_PASSWORD"]
    name = os.environ["DB_NAME"]
    url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"
    return create_engine(url, pool_pre_ping=True)


def asegurar_esquema_mantenimiento(engine) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                ALTER TABLE reservas
                ADD COLUMN IF NOT EXISTS mantenimiento_resultado VARCHAR
                    CHECK (
                        mantenimiento_resultado IN (
                            'REALIZADO', 'NO_REALIZADO'
                        )
                    )
                """
            )
        )


def _publicar_reserva_confirmada(reserva) -> None:
    payload = {
        "reservaId": reserva["id"],
        "vehiculoId": reserva["vehiculo_id"],
        "fechaInicio": reserva["fecha_inicio"].isoformat(),
        "fechaFin": reserva["fecha_finalizacion"].isoformat(),
    }
    try:
        broker.publicar(contratos.RESERVA_CONFIRMADA, payload)
    except AMQPError as error:
        print(
            f"[eventos] no se pudo publicar reserva.confirmada para la "
            f"reserva {reserva['id']} ({error!r})",
            flush=True,
        )


def _registrar_resultado_mantenimiento(engine, payload: dict, _evento: dict) -> None:
    with engine.begin() as conn:
        reserva = conn.execute(
            text(
                """
                UPDATE reservas
                SET mantenimiento_resultado = :resultado,
                    "actualizadoEn" = now()
                WHERE id = :reserva_id AND vehiculo_id = :vehiculo_id
                RETURNING id
                """
            ),
            {
                "resultado": payload["resultado"],
                "reserva_id": payload["reservaId"],
                "vehiculo_id": payload["vehiculoId"],
            },
        ).first()

    if reserva is None:
        raise ValueError(
            "No existe la reserva "
            f"{payload['reservaId']} para el vehículo {payload['vehiculoId']}"
        )

    print(
        f"[eventos] mantenimiento de reserva {reserva.id}: "
        f"{payload['resultado']}",
        flush=True,
    )


def _parsear_fecha(valor: str, nombre: str, context) -> datetime:
    try:
        fecha = datetime.fromisoformat(valor.replace("Z", "+00:00"))
    except ValueError:
        context.abort(grpc.StatusCode.INVALID_ARGUMENT, f"{nombre} no es válida")
    if fecha.tzinfo is None or fecha.utcoffset() is None:
        context.abort(
            grpc.StatusCode.INVALID_ARGUMENT,
            f"{nombre} debe incluir la zona horaria",
        )
    return fecha


def _fila_a_pb(reserva) -> pb.Reserva:
    respuesta = pb.Reserva()
    respuesta.id = reserva["id"]
    respuesta.vehiculo_id = reserva["vehiculo_id"]
    respuesta.cliente_id = reserva["cliente_id"]
    respuesta.fecha_inicio = reserva["fecha_inicio"].isoformat()
    respuesta.fecha_finalizacion = reserva["fecha_finalizacion"].isoformat()
    respuesta.importe_total = float(reserva["importe_total"])
    respuesta.estado = pb.EstadoReserva.Value(reserva["estado"])
    respuesta.activo = reserva["activo"]
    return respuesta


_SELECT_RESERVA = """
    SELECT id, vehiculo_id, cliente_id,
           "fechaInicio" AS fecha_inicio,
           "fechaFinalizacion" AS fecha_finalizacion,
           "importeTotal" AS importe_total, estado, activo
    FROM reservas
"""


class ReservaServiceServicer(pb_grpc.ReservaServiceServicer):
    def __init__(self, engine, customer_channel, vehicle_channel):
        self.engine = engine
        self.customer_client = clientes_pb2_grpc.ClienteServiceStub(
            customer_channel
        )
        self.vehicle_client = vehiculos_pb2_grpc.VehiculoServiceStub(
            vehicle_channel
        )

    @staticmethod
    def _reenviar_error_grpc(error, context, servicio):
        detalle = error.details() or f"{servicio} no disponible"
        context.abort(error.code(), detalle)

    def CrearReserva(self, request, context):
        print("[gRPC] CrearReserva invocado por el Gateway", flush=True)
        if request.vehiculo_id <= 0 or request.cliente_id <= 0:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "Los identificadores de vehículo y cliente deben ser positivos",
            )

        inicio = _parsear_fecha(request.fecha_inicio, "fecha_inicio", context)
        fin = _parsear_fecha(
            request.fecha_finalizacion, "fecha_finalizacion", context
        )
        ahora = datetime.now(timezone.utc)
        if inicio <= ahora:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "La fecha de inicio debe ser futura",
            )
        if fin <= inicio:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "La fecha de finalización debe ser posterior a la fecha de inicio",
            )

        # Las llamadas remotas se hacen antes de abrir la transacción local:
        # nunca se mantiene una transacción SQL esperando una respuesta gRPC.
        try:
            cliente = self.customer_client.VerificarActivo(
                clientes_pb2.VerificarActivoRequest(id=request.cliente_id),
                timeout=5,
            )
            vehiculo = self.vehicle_client.ObtenerVehiculo(
                vehiculos_pb2.ObtenerVehiculoRequest(id=request.vehiculo_id),
                timeout=5,
            )
        except grpc.RpcError as error:
            self._reenviar_error_grpc(error, context, "servicio de dominio")

        if not cliente.activo:
            context.abort(
                grpc.StatusCode.NOT_FOUND,
                f"No existe un cliente activo con id {request.cliente_id}",
            )
        if not vehiculo.activo:
            context.abort(
                grpc.StatusCode.FAILED_PRECONDITION,
                f"El vehículo con id {request.vehiculo_id} está inactivo",
            )
        if (
            vehiculo.HasField("verificacion")
            and vehiculo.verificacion == vehiculos_pb2.ROBADO
        ):
            context.abort(
                grpc.StatusCode.FAILED_PRECONDITION,
                f"El vehículo con id {request.vehiculo_id} está denunciado "
                "como robado y no admite nuevas reservas",
            )

        dias = math.ceil((fin - inicio).total_seconds() / 86_400)
        precio_centavos = int(
            (Decimal(str(vehiculo.precio_diario)) * 100).quantize(
                Decimal("1"), rounding=ROUND_HALF_UP
            )
        )
        importe_total = Decimal(precio_centavos * dias) / 100

        try:
            with self.engine.begin() as conn:
                reserva = conn.execute(
                    text(
                        """
                        INSERT INTO reservas
                            (vehiculo_id, cliente_id, "fechaInicio",
                             "fechaFinalizacion", "importeTotal", estado, activo,
                             "creadoEn", "actualizadoEn")
                        VALUES
                            (:vehiculo_id, :cliente_id, :inicio, :fin,
                             :importe_total, 'CONFIRMADA', true, now(), now())
                        RETURNING id, vehiculo_id, cliente_id,
                                  "fechaInicio" AS fecha_inicio,
                                  "fechaFinalizacion" AS fecha_finalizacion,
                                  "importeTotal" AS importe_total, estado, activo
                        """
                    ),
                    {
                        "vehiculo_id": request.vehiculo_id,
                        "cliente_id": request.cliente_id,
                        "inicio": inicio,
                        "fin": fin,
                        "importe_total": importe_total,
                    },
                ).mappings().one()
        except IntegrityError as error:
            if getattr(error.orig, "pgcode", None) == "23P01":
                context.abort(
                    grpc.StatusCode.ALREADY_EXISTS,
                    "El vehículo ya está reservado para esas fechas",
                )
            raise
        _publicar_reserva_confirmada(reserva)
        return _fila_a_pb(reserva)

    def ConsultarReservas(self, request, context):
        print("[gRPC] ConsultarReservas invocado por el Gateway", flush=True)
        condiciones = []
        parametros = {}
        if request.HasField("cliente_id"):
            condiciones.append("cliente_id = :cliente_id")
            parametros["cliente_id"] = request.cliente_id
        if request.HasField("estado"):
            estado = pb.EstadoReserva.Name(request.estado)
            if estado != "ESTADO_RESERVA_UNSPECIFIED":
                condiciones.append("estado = :estado")
                parametros["estado"] = estado

        consulta = _SELECT_RESERVA
        if condiciones:
            consulta += " WHERE " + " AND ".join(condiciones)
        consulta += ' ORDER BY "fechaInicio" DESC'
        with self.engine.connect() as conn:
            reservas = conn.execute(text(consulta), parametros).mappings().all()

        respuesta = pb.ConsultarReservasResponse()
        for reserva in reservas:
            respuesta.reservas.append(_fila_a_pb(reserva))
        return respuesta

    def CancelarReserva(self, request, context):
        print(f"[gRPC] CancelarReserva({request.id}) invocado", flush=True)
        if request.id <= 0 or request.cliente_id <= 0:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "Los identificadores de reserva y cliente deben ser positivos",
            )

        with self.engine.begin() as conn:
            reserva = conn.execute(
                text(_SELECT_RESERVA + " WHERE id = :id FOR UPDATE"),
                {"id": request.id},
            ).mappings().first()
            if reserva is None:
                context.abort(
                    grpc.StatusCode.NOT_FOUND,
                    f"No existe una reserva con id {request.id}",
                )
            if reserva["cliente_id"] != request.cliente_id:
                context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "No podés cancelar una reserva de otro cliente",
                )
            if reserva["estado"] == "CANCELADA":
                context.abort(
                    grpc.StatusCode.ALREADY_EXISTS,
                    "La reserva ya está cancelada",
                )
            if reserva["fecha_inicio"] <= datetime.now(timezone.utc):
                context.abort(
                    grpc.StatusCode.FAILED_PRECONDITION,
                    "No se puede cancelar una reserva cuyo alquiler ya comenzó",
                )

            reserva_actualizada = conn.execute(
                text(
                    """
                    UPDATE reservas
                    SET estado = 'CANCELADA', "actualizadoEn" = now()
                    WHERE id = :id
                    RETURNING id, vehiculo_id, cliente_id,
                              "fechaInicio" AS fecha_inicio,
                              "fechaFinalizacion" AS fecha_finalizacion,
                              "importeTotal" AS importe_total, estado, activo
                    """
                ),
                {"id": request.id},
            ).mappings().one()
        return _fila_a_pb(reserva_actualizada)

    def ConsultarHistorial(self, request, context):
        print("[gRPC] ConsultarHistorial invocado por el Gateway", flush=True)
        condiciones = [
            "(estado = 'CANCELADA' OR "
            "(estado = 'CONFIRMADA' AND \"fechaFinalizacion\" <= now()))"
        ]
        parametros = {}
        if request.HasField("cliente_id"):
            condiciones.append("cliente_id = :cliente_id")
            parametros["cliente_id"] = request.cliente_id

        with self.engine.connect() as conn:
            reservas = conn.execute(
                text(
                    _SELECT_RESERVA
                    + " WHERE "
                    + " AND ".join(condiciones)
                    + ' ORDER BY "fechaFinalizacion" DESC'
                ),
                parametros,
            ).mappings().all()

        respuesta = pb.ConsultarHistorialResponse()
        for reserva in reservas:
            item = dict(reserva)
            if item["estado"] == "CONFIRMADA":
                item["estado"] = "FINALIZADA"
            respuesta.reservas.append(_fila_a_pb(item))
        return respuesta

    def ConsultarVehiculosOcupados(self, request, context):
        print("[gRPC] ConsultarVehiculosOcupados invocado", flush=True)
        inicio = _parsear_fecha(request.fecha_inicio, "fecha_inicio", context)
        fin = _parsear_fecha(
            request.fecha_finalizacion, "fecha_finalizacion", context
        )
        if fin <= inicio:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "La fecha de finalización debe ser posterior a la fecha de inicio",
            )

        with self.engine.connect() as conn:
            filas = conn.execute(
                text(
                    """
                    SELECT DISTINCT vehiculo_id
                    FROM reservas
                    WHERE activo = true
                      AND estado = 'CONFIRMADA'
                      AND "fechaInicio" < :fin
                      AND "fechaFinalizacion" > :inicio
                    """
                ),
                {"inicio": inicio, "fin": fin},
            ).all()
        return pb.ConsultarVehiculosOcupadosResponse(
            vehiculo_ids=[fila[0] for fila in filas]
        )

    def ConsultarEstadosVehiculos(self, request, context):
        print("[gRPC] ConsultarEstadosVehiculos invocado", flush=True)
        ids = list(request.vehiculo_ids)
        respuesta = pb.ConsultarEstadosVehiculosResponse()
        if not ids:
            return respuesta

        with self.engine.connect() as conn:
            filas = conn.execute(
                text(
                    """
                    SELECT vehiculo_id, "fechaInicio"
                    FROM reservas
                    WHERE vehiculo_id = ANY(:ids)
                      AND activo = true
                      AND estado = 'CONFIRMADA'
                      AND "fechaFinalizacion" > now()
                    """
                ),
                {"ids": ids},
            ).mappings().all()

        ahora = datetime.now(timezone.utc)
        inicios_por_vehiculo = {}
        for fila in filas:
            inicios_por_vehiculo.setdefault(fila["vehiculo_id"], []).append(
                fila["fechaInicio"]
            )

        for vehiculo_id in ids:
            inicios = inicios_por_vehiculo.get(vehiculo_id, [])
            if any(inicio <= ahora for inicio in inicios):
                estado = "EN_ALQUILER"
            elif inicios:
                estado = "RESERVADO"
            else:
                estado = "DISPONIBLE"
            respuesta.estados.append(
                pb.EstadoVehiculoReserva(
                    vehiculo_id=vehiculo_id,
                    estado=estado,
                )
            )
        return respuesta


def main():
    engine = engine_desde_env()
    asegurar_esquema_mantenimiento(engine)
    customer_channel = grpc.insecure_channel(
        os.environ.get("CUSTOMER_SERVICE_URL", "localhost:50052")
    )
    vehicle_channel = grpc.insecure_channel(
        os.environ.get("VEHICLE_SERVICE_URL", "localhost:50051")
    )
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    pb_grpc.add_ReservaServiceServicer_to_server(
        ReservaServiceServicer(engine, customer_channel, vehicle_channel), server
    )
    puerto = os.environ.get("GRPC_PORT", "50053")
    server.add_insecure_port(f"[::]:{puerto}")
    print(f"Rental Service escuchando en puerto {puerto}", flush=True)
    server.start()
    broker.escuchar(
        contratos.COLA_RESERVAS_MANTENIMIENTO,
        {
            contratos.MANTENIMIENTO_RESULTADO: lambda payload, evento: (
                _registrar_resultado_mantenimiento(engine, payload, evento)
            )
        },
    )
    server.wait_for_termination()


if __name__ == "__main__":
    main()
