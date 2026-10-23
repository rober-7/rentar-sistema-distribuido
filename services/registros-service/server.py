"""Registros Service - registros externos simulados (Hito 3, Rentar).

Simula sistemas de terceros que Rentar consulta de forma asíncrona. Tiene su
propia base (registros_db), que ningún otro servicio lee:

- Registro policial: patentes con denuncia de robo (tabla patentes_robadas).

No expone gRPC: se comunica solo por eventos. Consume
vehiculos.verificacion.solicitada y responde con
vehiculos.verificacion.resultado.
"""

import os
import threading
import time

from sqlalchemy import create_engine, text

from eventos import broker, contratos

# Demora simulada de la consulta al registro externo, para que en la demo se
# vea que el alta del vehículo responde antes de que llegue el resultado.
DEMORA_SEGUNDOS = float(os.environ.get("DEMORA_VERIFICACION_SEGUNDOS", "3"))


def engine_desde_env():
    host = os.environ["DB_HOST"]
    port = os.environ.get("DB_PORT", "5432")
    user = os.environ["DB_USER"]
    password = os.environ["DB_PASSWORD"]
    name = os.environ["DB_NAME"]
    url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"
    return create_engine(url, pool_pre_ping=True)


def normalizar_patente(patente: str) -> str:
    """'ab 123-cd' -> 'AB123CD'. El registro guarda las patentes así."""
    return "".join(patente.split()).replace("-", "").upper()


def patente_denunciada(engine, patente: str) -> bool:
    with engine.connect() as conn:
        fila = conn.execute(
            text("SELECT 1 FROM patentes_robadas WHERE patente = :patente"),
            {"patente": normalizar_patente(patente)},
        ).first()
    return fila is not None


def verificar_vehiculo(engine, payload: dict, _evento: dict) -> None:
    print(
        f"[registros] verificando patente {payload['patente']} "
        f"(vehículo {payload['vehiculoId']})",
        flush=True,
    )
    time.sleep(DEMORA_SEGUNDOS)
    resultado = (
        "ROBADO" if patente_denunciada(engine, payload["patente"]) else "VALIDADO"
    )
    broker.publicar(
        contratos.VERIFICACION_RESULTADO,
        {
            "vehiculoId": payload["vehiculoId"],
            "patente": payload["patente"],
            "resultado": resultado,
        },
    )


def main():
    engine = engine_desde_env()
    broker.escuchar(
        contratos.COLA_REGISTROS_VERIFICACION,
        {
            contratos.VERIFICACION_SOLICITADA: lambda payload, evento: (
                verificar_vehiculo(engine, payload, evento)
            )
        },
    )
    print("Registros Service escuchando eventos", flush=True)
    # Los consumidores corren en hilos daemon: el hilo principal solo espera.
    threading.Event().wait()


if __name__ == "__main__":
    main()
