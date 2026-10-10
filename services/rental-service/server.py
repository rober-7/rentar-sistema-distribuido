"""Rental Service: microservicio gRPC para Reservas e historial de alquiler. (Hito 2, Punto 4)

Implementa las cuatro operaciones del contrato (CrearReserva, ConsultarReservas, CancelarReserva, ConsultarHistorial) 
leyendo directamente la base de datos Postgres compartida (tabla "reservas").


"""

import math
import os
import sys
from concurrent import futures
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

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
            os.path.join(PROTO_DIR, "reservas.proto"),
        ]
    )
    if codigo != 0:
        raise RuntimeError("Fallo compilando reservas.proto")


compilar_proto()
sys.path.insert(0, GENERATED_DIR)

import reservas_pb2 as pb  # noqa: E402
import reservas_pb2_grpc as pb_grpc  # noqa: E402


def engine_desde_env():
    host = os.environ["DB_HOST"]
    port = os.environ.get("DB_PORT", "5432")
    user = os.environ["DB_USER"]
    password = os.environ["DB_PASSWORD"]
    name = os.environ["DB_NAME"]
    url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"
    return create_engine(url, pool_pre_ping=True)


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
    def __init__(self, engine):
        self.engine = engine

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

        with self.engine.begin() as conn:
            cliente = conn.execute(
                text(
                    """
                    SELECT id, activo
                    FROM usuarios
                    WHERE id = :id AND rol = 'CLIENTE'
                    FOR SHARE
                    """
                ),
                {"id": request.cliente_id},
            ).mappings().first()
            if cliente is None:
                context.abort(
                    grpc.StatusCode.NOT_FOUND,
                    f"No existe un cliente con id {request.cliente_id}",
                )
            if not cliente["activo"]:
                context.abort(
                    grpc.StatusCode.NOT_FOUND,
                    f"No existe un cliente activo con id {request.cliente_id}",
                )

            vehiculo = conn.execute(
                text(
                    """
                    SELECT id, "precioDiario" AS precio_diario, activo
                    FROM vehiculos
                    WHERE id = :id
                    FOR UPDATE
                    """
                ),
                {"id": request.vehiculo_id},
            ).mappings().first()
            if vehiculo is None:
                context.abort(
                    grpc.StatusCode.NOT_FOUND,
                    f"No existe un vehículo con id {request.vehiculo_id}",
                )
            if not vehiculo["activo"]:
                context.abort(
                    grpc.StatusCode.FAILED_PRECONDITION,
                    f"El vehículo con id {request.vehiculo_id} está inactivo",
                )

            solapada = conn.execute(
                text(
                    """
                    SELECT 1
                    FROM reservas
                    WHERE vehiculo_id = :vehiculo_id
                      AND activo = true
                      AND estado = 'CONFIRMADA'
                      AND "fechaInicio" < :fin
                      AND "fechaFinalizacion" > :inicio
                    LIMIT 1
                    """
                ),
                {
                    "vehiculo_id": request.vehiculo_id,
                    "inicio": inicio,
                    "fin": fin,
                },
            ).first()
            if solapada is not None:
                context.abort(
                    grpc.StatusCode.ALREADY_EXISTS,
                    "El vehículo ya está reservado para esas fechas",
                )

            dias = math.ceil((fin - inicio).total_seconds() / 86_400)
            precio_centavos = int(
                (Decimal(str(vehiculo["precio_diario"])) * 100).quantize(
                    Decimal("1"), rounding=ROUND_HALF_UP
                )
            )
            importe_total = Decimal(precio_centavos * dias) / 100
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


def main():
    engine = engine_desde_env()
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    pb_grpc.add_ReservaServiceServicer_to_server(
        ReservaServiceServicer(engine), server
    )
    puerto = os.environ.get("GRPC_PORT", "50053")
    server.add_insecure_port(f"[::]:{puerto}")
    print(f"Rental Service escuchando en puerto {puerto}", flush=True)
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    main()
