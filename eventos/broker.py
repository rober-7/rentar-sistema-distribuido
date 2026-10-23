"""Cliente de RabbitMQ compartido por los servicios Python (Hito 3).

- publicar(): arma el sobre del evento, valida el payload contra el contrato y
  lo envía al exchange esperando la confirmación del broker.
- escuchar(): consume una cola en un hilo propio (el hilo principal sigue
  atendiendo gRPC) y despacha cada evento a la función registrada para su tipo.

Se usa pika (cliente bloqueante) porque los servicios son servidores gRPC
síncronos con hilos; no hace falta un event loop asyncio.
"""

import json
import os
import threading
import time
import uuid
from datetime import datetime, timezone

import pika
from pika.exceptions import AMQPError

from eventos import contratos

RABBITMQ_URL = os.environ.get(
    "RABBITMQ_URL", "amqp://rentar:rentar@rabbitmq:5672/%2F"
)
SERVICIO = os.environ.get("SERVICIO", "desconocido")
SEGUNDOS_REINTENTO = 5


def _conectar() -> pika.BlockingConnection:
    return pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))


def _declarar_topologia(canal) -> None:
    """Declara exchange, colas y bindings de contratos.TOPOLOGIA.

    Es idempotente y la ejecuta todo servicio al conectarse: así las colas
    existen aunque su consumidor todavía no haya arrancado y ningún evento
    publicado se pierde por falta de destino.
    """
    canal.exchange_declare(contratos.EXCHANGE, exchange_type="topic", durable=True)
    canal.exchange_declare(
        contratos.EXCHANGE_ERRORES, exchange_type="fanout", durable=True
    )
    canal.queue_declare(contratos.COLA_ERRORES, durable=True)
    canal.queue_bind(contratos.COLA_ERRORES, contratos.EXCHANGE_ERRORES)

    for cola, tipos in contratos.TOPOLOGIA.items():
        canal.queue_declare(
            cola,
            durable=True,
            arguments={"x-dead-letter-exchange": contratos.EXCHANGE_ERRORES},
        )
        for tipo in tipos:
            canal.queue_bind(cola, contratos.EXCHANGE, routing_key=tipo)


def publicar(tipo: str, payload: dict, origen: str | None = None) -> dict:
    """Publica un evento y devuelve el sobre enviado.

    Lanza excepción si el payload no respeta el contrato o si el broker no
    confirma la recepción; el que llama decide qué hacer en ese caso.
    """
    contratos.validar(tipo, payload)
    evento = {
        "eventId": str(uuid.uuid4()),
        "tipo": tipo,
        "version": 1,
        "fecha": datetime.now(timezone.utc).isoformat(),
        "origen": origen or SERVICIO,
        "payload": payload,
    }

    # Una conexión por publicación: una BlockingConnection ociosa pierde los
    # heartbeats y el broker la cierra, y además no es segura entre los hilos
    # del ThreadPoolExecutor de gRPC. El costo es despreciable para este uso.
    conexion = _conectar()
    try:
        canal = conexion.channel()
        _declarar_topologia(canal)
        canal.confirm_delivery()
        canal.basic_publish(
            exchange=contratos.EXCHANGE,
            routing_key=tipo,
            body=json.dumps(evento, ensure_ascii=False).encode("utf-8"),
            properties=pika.BasicProperties(
                content_type="application/json",
                delivery_mode=pika.DeliveryMode.Persistent,
                message_id=evento["eventId"],
                type=tipo,
                app_id=evento["origen"],
            ),
            mandatory=True,
        )
    finally:
        conexion.close()

    print(f"[eventos] publicado {tipo} {evento['eventId']}: {payload}", flush=True)
    return evento


def escuchar(cola: str, manejadores: dict) -> threading.Thread:
    """Consume `cola` en segundo plano.

    `manejadores` mapea tipo de evento -> función(payload, evento). Si la
    función termina bien el mensaje se confirma (ack); si lanza excepción se
    descarta hacia rentar.errores para no reprocesarlo en bucle.
    """
    if cola not in contratos.TOPOLOGIA:
        raise ValueError(f"Cola desconocida: {cola}")
    hilo = threading.Thread(
        target=_bucle_consumo,
        args=(cola, manejadores),
        name=f"consumidor-{cola}",
        daemon=True,
    )
    hilo.start()
    return hilo


def _bucle_consumo(cola: str, manejadores: dict) -> None:
    while True:
        try:
            conexion = _conectar()
            canal = conexion.channel()
            _declarar_topologia(canal)
            # De a un mensaje por vez: no se toma el siguiente hasta confirmar.
            canal.basic_qos(prefetch_count=1)
            canal.basic_consume(
                cola,
                on_message_callback=lambda ch, metodo, _props, cuerpo: _procesar(
                    ch, metodo, cuerpo, cola, manejadores
                ),
            )
            print(f"[eventos] escuchando cola {cola}", flush=True)
            canal.start_consuming()
        except AMQPError as error:
            print(
                f"[eventos] sin conexión con RabbitMQ en {cola} ({error!r}); "
                f"reintento en {SEGUNDOS_REINTENTO}s",
                flush=True,
            )
            time.sleep(SEGUNDOS_REINTENTO)


def _procesar(canal, metodo, cuerpo: bytes, cola: str, manejadores: dict) -> None:
    try:
        evento = json.loads(cuerpo)
        tipo = evento["tipo"]
        if tipo not in manejadores:
            raise ValueError(f"la cola {cola} no tiene manejador para {tipo}")
        contratos.validar(tipo, evento["payload"])
        manejadores[tipo](evento["payload"], evento)
    except Exception as error:  # noqa: BLE001 - cualquier fallo va a errores
        print(
            f"[eventos] error procesando mensaje de {cola}: {error!r}; "
            f"se envía a {contratos.COLA_ERRORES}",
            flush=True,
        )
        canal.basic_nack(metodo.delivery_tag, requeue=False)
        return

    canal.basic_ack(metodo.delivery_tag)
    print(f"[eventos] procesado {tipo} {evento['eventId']} desde {cola}", flush=True)
