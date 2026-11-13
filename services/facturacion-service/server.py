"""Facturacion Service: liquida alquileres finalizados y emite comprobantes.

Consume de forma asíncrona el evento 'alquileres.devolucion.registrada'
desde RabbitMQ, calcula penalizaciones por exceso de kilometraje y estado
general del vehículo, persiste el comprobante de manera idempotente en su
propia base PostgreSQL (facturacion_db) y publica 'facturacion.comprobante.emitido'.
"""

import os
import threading
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import create_engine, text

from eventos import broker, contratos

TOPE_KM_INCLUIDOS = int(os.environ.get("TOPE_KM_INCLUIDOS", "1000"))
COSTO_POR_KM_EXCEDIDO = Decimal(
    os.environ.get("COSTO_POR_KM_EXCEDIDO", "50.00")
)

PENALIZACION_POR_ESTADO = {
    "EXCELENTE": Decimal("0.00"),
    "BUENO": Decimal("0.00"),
    "DANIO_LEVE": Decimal("25000.00"),
    "DANIO_GRAVE": Decimal("100000.00"),
}


def engine_desde_env():
    host = os.environ["DB_HOST"]
    port = os.environ.get("DB_PORT", "5432")
    user = os.environ["DB_USER"]
    password = os.environ["DB_PASSWORD"]
    name = os.environ["DB_NAME"]
    url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"
    return create_engine(url, pool_pre_ping=True)


def asegurar_esquema(engine) -> None:
    ruta_sql = os.path.join(os.path.dirname(__file__), "db", "init.sql")
    with open(ruta_sql, encoding="utf-8") as archivo:
        ddl = archivo.read()
    with engine.begin() as conn:
        conn.execute(text(ddl))


def _redondear_moneda(valor: Decimal) -> Decimal:
    return valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calcular_liquidacion(
    importe_base: Decimal, kilometraje_final: int, estado_general: str
) -> tuple[Decimal, Decimal, Decimal, str]:
    if estado_general not in PENALIZACION_POR_ESTADO:
        raise ValueError(f"estado_general inválido: {estado_general!r}")

    km_excedidos = max(0, kilometraje_final - TOPE_KM_INCLUIDOS)
    penalizacion_km = _redondear_moneda(
        Decimal(km_excedidos) * COSTO_POR_KM_EXCEDIDO
    )
    penalizacion_danios = PENALIZACION_POR_ESTADO[estado_general]
    importe_total_final = _redondear_moneda(
        importe_base + penalizacion_km + penalizacion_danios
    )

    detalle = (
        f"Base: ${importe_base:.2f} | "
        f"Exceso km ({km_excedidos} km sobre tope de {TOPE_KM_INCLUIDOS} km): "
        f"${penalizacion_km:.2f} | "
        f"Estado {estado_general}: ${penalizacion_danios:.2f}"
    )
    return penalizacion_km, penalizacion_danios, importe_total_final, detalle


def procesar_devolucion(engine, payload: dict, _evento: dict) -> None:
    reserva_id = int(payload["reserva_id"])
    vehiculo_id = int(payload["vehiculo_id"])
    cliente_id = int(payload["cliente_id"])
    kilometraje_final = int(payload["kilometraje_final"])
    importe_base = _redondear_moneda(Decimal(str(payload["importe_base"])))
    estado_general = str(payload["estado_general"])

    if reserva_id <= 0 or vehiculo_id <= 0 or cliente_id <= 0:
        raise ValueError("Los identificadores del evento deben ser positivos")
    if kilometraje_final < 0 or importe_base < 0:
        raise ValueError("Kilometraje e importe_base no pueden ser negativos")

    (
        penalizacion_km,
        penalizacion_danios,
        importe_total_final,
        detalle,
    ) = calcular_liquidacion(importe_base, kilometraje_final, estado_general)

    with engine.begin() as conn:
        comprobante = conn.execute(
            text(
                """
                INSERT INTO comprobantes
                    (reserva_id, cliente_id, vehiculo_id, kilometraje_final,
                     estado_general, importe_base, penalizacion_km,
                     penalizacion_danios, importe_total_final, detalle)
                VALUES
                    (:reserva_id, :cliente_id, :vehiculo_id, :kilometraje_final,
                     :estado_general, :importe_base, :penalizacion_km,
                     :penalizacion_danios, :importe_total_final, :detalle)
                ON CONFLICT (reserva_id) DO NOTHING
                RETURNING id, reserva_id, cliente_id, vehiculo_id,
                          importe_base, penalizacion_km, penalizacion_danios,
                          importe_total_final, emitido_en
                """
            ),
            {
                "reserva_id": reserva_id,
                "cliente_id": cliente_id,
                "vehiculo_id": vehiculo_id,
                "kilometraje_final": kilometraje_final,
                "estado_general": estado_general,
                "importe_base": importe_base,
                "penalizacion_km": penalizacion_km,
                "penalizacion_danios": penalizacion_danios,
                "importe_total_final": importe_total_final,
                "detalle": detalle,
            },
        ).mappings().first()

    if comprobante is None:
        with engine.connect() as conn:
            comprobante = conn.execute(
                text(
                    """
                    SELECT id, reserva_id, cliente_id, vehiculo_id,
                           importe_base, penalizacion_km, penalizacion_danios,
                           importe_total_final, emitido_en
                    FROM comprobantes
                    WHERE reserva_id = :reserva_id
                    """
                ),
                {"reserva_id": reserva_id},
            ).mappings().one()
        print(
            f"[facturacion] reserva {reserva_id} ya tenía el comprobante "
            f"#{comprobante['id']}; se republica confirmación idempotente",
            flush=True,
        )
    else:
        print(
            f"[facturacion] comprobante #{comprobante['id']} emitido para "
            f"reserva {reserva_id}: total=${comprobante['importe_total_final']} "
            f"({detalle})",
            flush=True,
        )

    broker.publicar(
        contratos.COMPROBANTE_EMITIDO,
        {
            "comprobante_id": comprobante["id"],
            "reserva_id": comprobante["reserva_id"],
            "cliente_id": comprobante["cliente_id"],
            "vehiculo_id": comprobante["vehiculo_id"],
            "importe_base": float(comprobante["importe_base"]),
            "penalizacion_km": float(comprobante["penalizacion_km"]),
            "penalizacion_danios": float(comprobante["penalizacion_danios"]),
            "importe_total_final": float(comprobante["importe_total_final"]),
            "emitido_en": comprobante["emitido_en"].isoformat(),
        },
    )


def main():
    engine = engine_desde_env()
    asegurar_esquema(engine)
    broker.escuchar(
        contratos.COLA_FACTURACION_DEVOLUCIONES,
        {
            contratos.DEVOLUCION_REGISTRADA: lambda payload, evento: (
                procesar_devolucion(engine, payload, evento)
            )
        },
    )
    print("Facturacion Service escuchando eventos de devolución", flush=True)
    threading.Event().wait()


if __name__ == "__main__":
    main()
