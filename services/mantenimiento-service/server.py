"""Mantenimiento Service: registra solicitudes disparadas por reservas."""

import os
import threading
import time
from datetime import datetime

from sqlalchemy import create_engine, text

from eventos import broker, contratos

DEMORA_SEGUNDOS = float(
    os.environ.get("DEMORA_MANTENIMIENTO_SEGUNDOS", "2")
)
RESULTADO_SIMULADO = os.environ.get("RESULTADO_MANTENIMIENTO", "REALIZADO")
RESULTADOS_PERMITIDOS = {"REALIZADO", "NO_REALIZADO"}


if not 0 <= DEMORA_SEGUNDOS < 60:
    raise ValueError(
        "DEMORA_MANTENIMIENTO_SEGUNDOS debe ser mayor o igual a 0 y menor "
        "a 60 para no perder la conexión con RabbitMQ"
    )
if RESULTADO_SIMULADO not in RESULTADOS_PERMITIDOS:
    raise ValueError(
        "RESULTADO_MANTENIMIENTO debe ser REALIZADO o NO_REALIZADO"
    )


def engine_desde_env():
    host = os.environ["DB_HOST"]
    port = os.environ.get("DB_PORT", "5432")
    user = os.environ["DB_USER"]
    password = os.environ["DB_PASSWORD"]
    name = os.environ["DB_NAME"]
    url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"
    return create_engine(url, pool_pre_ping=True)


def _parsear_fecha(valor: str) -> datetime:
    fecha = datetime.fromisoformat(valor.replace("Z", "+00:00"))
    if fecha.tzinfo is None or fecha.utcoffset() is None:
        raise ValueError("Las fechas del evento deben incluir zona horaria")
    return fecha


def procesar_solicitud(engine, payload: dict, _evento: dict) -> None:
    reserva_id = payload["reservaId"]
    vehiculo_id = payload["vehiculoId"]
    fecha_inicio = _parsear_fecha(payload["fechaInicio"])
    fecha_fin = _parsear_fecha(payload["fechaFin"])
    if fecha_fin <= fecha_inicio:
        raise ValueError("fechaFin debe ser posterior a fechaInicio")

    with engine.begin() as conn:
        solicitud = conn.execute(
            text(
                """
                INSERT INTO solicitudes_mantenimiento
                    (reserva_id, vehiculo_id, fecha_inicio, fecha_fin)
                VALUES
                    (:reserva_id, :vehiculo_id, :fecha_inicio, :fecha_fin)
                ON CONFLICT (reserva_id) DO NOTHING
                RETURNING id, vehiculo_id, fecha_inicio, fecha_fin, resultado
                """
            ),
            {
                "reserva_id": reserva_id,
                "vehiculo_id": vehiculo_id,
                "fecha_inicio": fecha_inicio,
                "fecha_fin": fecha_fin,
            },
        ).mappings().first()

    if solicitud is None:
        with engine.connect() as conn:
            solicitud = conn.execute(
                text(
                    """
                    SELECT id, vehiculo_id, fecha_inicio, fecha_fin, resultado
                    FROM solicitudes_mantenimiento
                    WHERE reserva_id = :reserva_id
                    """
                ),
                {"reserva_id": reserva_id},
            ).mappings().one()

        if (
            solicitud["vehiculo_id"] != vehiculo_id
            or solicitud["fecha_inicio"] != fecha_inicio
            or solicitud["fecha_fin"] != fecha_fin
        ):
            raise ValueError(
                f"El evento de reserva {reserva_id} no coincide con la "
                "solicitud de mantenimiento existente"
            )

    print(
        f"[mantenimiento] solicitud {solicitud['id']} registrada para "
        f"reserva {reserva_id} (vehículo {vehiculo_id})",
        flush=True,
    )

    resultado = solicitud["resultado"]
    if resultado is None:
        print(
            f"[mantenimiento] procesando reserva {reserva_id}",
            flush=True,
        )
        time.sleep(DEMORA_SEGUNDOS)
        with engine.begin() as conn:
            fila = conn.execute(
                text(
                    """
                    UPDATE solicitudes_mantenimiento
                    SET resultado = COALESCE(resultado, :resultado),
                        actualizado_en = now()
                    WHERE reserva_id = :reserva_id
                    RETURNING resultado
                    """
                ),
                {
                    "reserva_id": reserva_id,
                    "resultado": RESULTADO_SIMULADO,
                },
            ).one()
        resultado = fila.resultado
    else:
        print(
            f"[mantenimiento] reserva {reserva_id} ya procesada; "
            "se republicará el resultado guardado",
            flush=True,
        )

    broker.publicar(
        contratos.MANTENIMIENTO_RESULTADO,
        {
            "reservaId": reserva_id,
            "vehiculoId": vehiculo_id,
            "resultado": resultado,
        },
    )
    print(
        f"[mantenimiento] resultado de reserva {reserva_id}: {resultado}",
        flush=True,
    )


def main():
    engine = engine_desde_env()
    broker.escuchar(
        contratos.COLA_MANTENIMIENTO_RESERVAS,
        {contratos.RESERVA_CONFIRMADA: lambda payload, evento: (
            procesar_solicitud(engine, payload, evento)
        )},
    )
    print("Mantenimiento Service escuchando eventos", flush=True)
    threading.Event().wait()


if __name__ == "__main__":
    main()
