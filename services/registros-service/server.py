"""Registros Service - registros externos simulados (Hito 3, Rentar).

Simula sistemas de terceros que Rentar consulta de forma asíncrona. Tiene su
propia base (registros_db), que ningún otro servicio lee:

- Registro policial: patentes con denuncia de robo (tabla patentes_robadas).
- Registro de titularidad: titular de cada patente (tabla titularidades).

No expone gRPC: se comunica solo por eventos. Consume:

- vehiculos.verificacion.solicitada -> responde vehiculos.verificacion.resultado.
- vehiculos.externos.registrados, en dos colas independientes:
  - registros.externos-patente -> vehiculos.externos.validacion.patente.
  - registros.externos-titularidad -> vehiculos.externos.validacion.titularidad.

Para la titularidad necesita el documento del cliente, que pertenece a
Customer Service: lo pide por gRPC (ObtenerCliente) con el clienteId del evento.
"""

import os
import sys
import threading
import time

import grpc
from grpc_tools import protoc
from sqlalchemy import create_engine, text

PROTO_DIR = os.path.join(os.path.dirname(__file__), "proto")
GENERATED_DIR = os.path.join(os.path.dirname(__file__), "generated")
DB_DIR = os.path.join(os.path.dirname(__file__), "db")


def compilar_proto() -> None:
    os.makedirs(GENERATED_DIR, exist_ok=True)
    open(os.path.join(GENERATED_DIR, "__init__.py"), "a").close()
    codigo = protoc.main(
        [
            "grpc_tools.protoc",
            f"-I{PROTO_DIR}",
            f"--python_out={GENERATED_DIR}",
            f"--grpc_python_out={GENERATED_DIR}",
            os.path.join(PROTO_DIR, "clientes.proto"),
        ]
    )
    if codigo != 0:
        raise RuntimeError("Fallo compilando clientes.proto")


compilar_proto()
sys.path.insert(0, GENERATED_DIR)

import clientes_pb2  # noqa: E402
import clientes_pb2_grpc  # noqa: E402
from eventos import broker, contratos  # noqa: E402

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


def asegurar_esquema(engine) -> None:
    """Aplica db/init.sql y db/002-seed.sql al arrancar.

    Postgres solo los ejecuta cuando el volumen es nuevo. Como los dos son
    idempotentes (IF NOT EXISTS, ON CONFLICT DO NOTHING), correrlos acá suma
    las tablas nuevas a una base existente sin tener que borrar el volumen.
    """
    with engine.begin() as conn:
        for archivo in ("init.sql", "002-seed.sql"):
            with open(os.path.join(DB_DIR, archivo), encoding="utf-8") as sql:
                conn.exec_driver_sql(sql.read())


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


def documento_titular(engine, patente: str) -> str | None:
    with engine.connect() as conn:
        fila = conn.execute(
            text("SELECT documento FROM titularidades WHERE patente = :patente"),
            {"patente": normalizar_patente(patente)},
        ).first()
    return fila[0] if fila is not None else None


def documento_cliente(customer_client, cliente_id: int) -> str | None:
    """Documento del cliente según Customer Service; None si no existe.

    wait_for_ready espera a que Customer Service esté levantado en vez de
    fallar en el acto. Cualquier otro error se propaga: el mensaje va a
    rentar.errores y queda a la vista en la consola de RabbitMQ.
    """
    try:
        cliente = customer_client.ObtenerCliente(
            clientes_pb2.ObtenerClienteRequest(id=cliente_id),
            timeout=10,
            wait_for_ready=True,
        )
    except grpc.RpcError as error:
        if error.code() == grpc.StatusCode.NOT_FOUND:
            return None
        raise
    return cliente.documento


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


def validar_patente_externo(engine, payload: dict, _evento: dict) -> None:
    print(
        f"[registros] validando patente {payload['patente']} "
        f"(vehículo externo {payload['vehiculoExternoId']})",
        flush=True,
    )
    time.sleep(DEMORA_SEGUNDOS)
    resultado = (
        "RECHAZADO" if patente_denunciada(engine, payload["patente"]) else "VALIDADO"
    )
    broker.publicar(
        contratos.EXTERNOS_VALIDACION_PATENTE,
        {
            "vehiculoExternoId": payload["vehiculoExternoId"],
            "patente": payload["patente"],
            "resultado": resultado,
        },
    )


def validar_titularidad_externo(
    engine, customer_client, payload: dict, _evento: dict
) -> None:
    print(
        f"[registros] validando titularidad de {payload['patente']} para el "
        f"cliente {payload['clienteId']} "
        f"(vehículo externo {payload['vehiculoExternoId']})",
        flush=True,
    )
    time.sleep(DEMORA_SEGUNDOS)
    documento = documento_cliente(customer_client, payload["clienteId"])
    titular = documento_titular(engine, payload["patente"])
    # Se rechaza si el cliente no existe, si la patente no figura en el
    # registro o si figura a nombre de otra persona.
    resultado = (
        "VALIDADO"
        if documento is not None and documento == titular
        else "RECHAZADO"
    )
    broker.publicar(
        contratos.EXTERNOS_VALIDACION_TITULARIDAD,
        {
            "vehiculoExternoId": payload["vehiculoExternoId"],
            "clienteId": payload["clienteId"],
            "documento": documento or "",
            "patente": payload["patente"],
            "resultado": resultado,
        },
    )


def main():
    engine = engine_desde_env()
    asegurar_esquema(engine)
    customer_client = clientes_pb2_grpc.ClienteServiceStub(
        grpc.insecure_channel(
            os.environ.get("CUSTOMER_SERVICE_URL", "localhost:50052")
        )
    )

    broker.escuchar(
        contratos.COLA_REGISTROS_VERIFICACION,
        {
            contratos.VERIFICACION_SOLICITADA: lambda payload, evento: (
                verificar_vehiculo(engine, payload, evento)
            )
        },
    )
    # Las dos validaciones de un vehículo externo consumen colas distintas y
    # corren en hilos distintos: se procesan en paralelo e independientes.
    broker.escuchar(
        contratos.COLA_REGISTROS_EXTERNOS_PATENTE,
        {
            contratos.EXTERNOS_REGISTRADOS: lambda payload, evento: (
                validar_patente_externo(engine, payload, evento)
            )
        },
    )
    broker.escuchar(
        contratos.COLA_REGISTROS_EXTERNOS_TITULARIDAD,
        {
            contratos.EXTERNOS_REGISTRADOS: lambda payload, evento: (
                validar_titularidad_externo(
                    engine, customer_client, payload, evento
                )
            )
        },
    )
    print("Registros Service escuchando eventos", flush=True)
    # Los consumidores corren en hilos daemon: el hilo principal solo espera.
    threading.Event().wait()


if __name__ == "__main__":
    main()
