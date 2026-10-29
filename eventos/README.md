# Eventos de Rentar (Hito 3)

Contratos de la comunicación asíncrona. Así como `proto/` define lo que los
servicios se piden **y esperan** por gRPC, esta carpeta define lo que se
**avisan sin esperar** a través de RabbitMQ.

| Archivo | Para qué |
|---|---|
| `contratos.py` | Nombres de eventos, colas, bindings y campos obligatorios. Es la fuente única de verdad. |
| `broker.py` | `publicar()` y `escuchar()`: lo único que cada servicio necesita usar. |
| `publicar.py` | Herramienta para publicar un evento a mano y probar un consumidor. |

La carpeta se monta en cada servicio Python en `/app/eventos`, igual que
`proto/` (ver `docker-compose.yml`).

## Decisiones

- **Broker:** RabbitMQ 3.13 con la consola de administración en
  http://localhost:15672 (usuario `rentar`, contraseña `rentar`).
- **Un solo exchange `rentar.eventos` de tipo `topic`.** El nombre del evento
  es la routing key, así que el broker manda cada evento solo a las colas que
  lo necesitan. En el ejemplo de la cátedra se usa `fanout` porque todos los
  consumidores reciben todo; acá cada cola recibe eventos distintos.
- **Una cola por consumidor y responsabilidad.** Si un evento lo procesan dos
  componentes (`vehiculos.externos.registrados`), va a dos colas y cada uno
  recibe su copia.
- **Cliente `pika`.** Los servicios son servidores gRPC con hilos, así que
  se usa el cliente bloqueante y cada consumidor corre en un hilo propio.
- **Todo es durable:** exchange, colas y mensajes persistentes. Si un
  consumidor está caído, los eventos lo esperan en su cola.
- **El Gateway no se conecta al broker.** Publican y consumen los servicios
  de dominio; el Gateway sigue consultando por gRPC el estado que resulta.

## Topología

```text
                                ┌───────────────────────────────┐
  productores ──publican──►     │  rentar.eventos  (topic)      │
                                └──┬────────────────────────────┘
                                   │ routing key = nombre del evento
   vehiculos.verificacion.solicitada ──► registros.verificacion            (registros-service)
   vehiculos.verificacion.resultado  ──► vehiculos.verificacion-resultado  (vehicle-service)
   vehiculos.externos.registrados    ──► registros.externos-patente        (registros-service)
                                     └─► registros.externos-titularidad    (registros-service)
   vehiculos.externos.validacion.patente ─────┐
   vehiculos.externos.validacion.titularidad ─┴► vehiculos.externos-validaciones (vehicle-service, correlador)
   vehiculos.externos.validacion.completada ──► vehiculos.externos-completada    (vehicle-service)
   reserva.confirmada                ──► mantenimiento.reservas-confirmadas (mantenimiento-service)
   mantenimiento.resultado           ──► reservas.mantenimiento-resultado   (rental-service)

   Mensaje que un consumidor no pudo procesar ──► rentar.eventos.dlx ──► rentar.errores
```

## Sobre del evento

Cada mensaje viaja dentro de un sobre que lo identifica. `payload` es
exactamente la estructura que pide el enunciado.

```json
{
  "eventId": "60ed9d9b-3dcf-4986-a85b-8bef4cadd045",
  "tipo": "mantenimiento.resultado",
  "version": 1,
  "fecha": "2026-10-23T22:48:05.836328+00:00",
  "origen": "mantenimiento-service",
  "payload": { "reservaId": 150, "vehiculoId": 15, "resultado": "REALIZADO" }
}
```

| Campo | Descripción |
|---|---|
| `eventId` | UUID único del mensaje. Sirve para detectar duplicados. También va en la propiedad AMQP `message_id`. |
| `tipo` | Nombre del evento. Coincide con la routing key y con la propiedad AMQP `type`. |
| `version` | Versión del contrato del payload. Hoy es siempre `1`. |
| `fecha` | Momento de publicación, en ISO 8601 UTC. |
| `origen` | Servicio que publicó (variable de entorno `SERVICIO`). |
| `payload` | Datos del evento según la tabla de abajo. |

`broker.publicar()` arma el sobre solo; nadie lo construye a mano.

## Catálogo

### Verificación de vehículos

| Evento | Productor | Consumidor (cola) | Payload |
|---|---|---|---|
| `vehiculos.verificacion.solicitada` | vehicle-service, al crear un vehículo | registros-service (`registros.verificacion`) | `vehiculoId` int, `patente` string |
| `vehiculos.verificacion.resultado` | registros-service | vehicle-service (`vehiculos.verificacion-resultado`) | `vehiculoId` int, `patente` string, `resultado` `VALIDADO` \| `ROBADO` |

```json
{ "vehiculoId": 15, "patente": "ABC123" }
{ "vehiculoId": 15, "patente": "ABC123", "resultado": "VALIDADO" }
```

`ROBADO` **no** es un estado del vehículo. vehicle-service lo guarda en la
columna `verificacion` (NULL mientras está pendiente), separada de `estado`.
Un vehículo `ROBADO` queda inhabilitado para nuevas operaciones:

- no aparece en la consulta de disponibilidad (`FiltrarVehiculos`);
- Rental Service rechaza crear una reserva sobre él (`FAILED_PRECONDITION`,
  que el Gateway devuelve como 409).

Un vehículo pendiente de verificación sí se puede reservar, porque la
verificación no bloquea el alta. Si al crear un vehículo el broker no está
disponible, el alta se guarda igual y vehicle-service vuelve a pedir la
verificación de todos los pendientes cada vez que arranca.

El registro policial simulado vive en `registros_db.patentes_robadas`. Las
patentes de prueba denunciadas son `AD123RB`, `AE456RB`, `AF789RB` y `RBO123`;
cualquier otra da `VALIDADO`. La consulta tiene una demora simulada de 3 s
(`DEMORA_VERIFICACION_SEGUNDOS`) para que en la demo se vea el `PENDIENTE`.

### Incorporación de vehículos de propietarios externos

| Evento | Productor | Consumidor (cola) | Payload |
|---|---|---|---|
| `vehiculos.externos.registrados` | vehicle-service, cuando un cliente registra su auto (queda `PENDIENTE`) | registros-service (`registros.externos-patente` y `registros.externos-titularidad`) | `vehiculoExternoId` int, `clienteId` int, `patente` string |
| `vehiculos.externos.validacion.patente` | registros-service | vehicle-service (`vehiculos.externos-validaciones`) | `vehiculoExternoId` int, `patente` string, `resultado` `VALIDADO` \| `RECHAZADO` |
| `vehiculos.externos.validacion.titularidad` | registros-service | vehicle-service (`vehiculos.externos-validaciones`) | `vehiculoExternoId` int, `clienteId` int, `documento` string, `patente` string, `resultado` `VALIDADO` \| `RECHAZADO` |
| `vehiculos.externos.validacion.completada` | vehicle-service (correlador), cuando las dos validaciones dieron `VALIDADO` | vehicle-service (`vehiculos.externos-completada`) | `vehiculoExternoId` int |

```json
{ "vehiculoExternoId": 50, "clienteId": 89, "patente": "DEF456" }
{ "vehiculoExternoId": 50, "patente": "DEF456", "resultado": "VALIDADO" }
{ "vehiculoExternoId": 50, "clienteId": 89, "documento": "30123456", "patente": "DEF456", "resultado": "VALIDADO" }
{ "vehiculoExternoId": 50 }
```

- **Correlación:** `vehiculoExternoId` identifica el proceso de incorporación.
  El correlador anota cada resultado en `vehiculos_externos`. Si llega un
  `RECHAZADO`, marca la solicitud como rechazada y no publica nada más. Si ya
  tiene los dos `VALIDADO`, publica `completada`. Los resultados pueden
  llegar en cualquier orden.
- **Documento:** el registro de titularidad recibe `clienteId` y obtiene el
  documento pidiéndoselo por gRPC a customer-service, para poder compararlo
  con el titular de la patente.

### Mantenimiento preventivo

| Evento | Productor | Consumidor (cola) | Payload |
|---|---|---|---|
| `reserva.confirmada` | rental-service, después de confirmar la reserva | mantenimiento-service (`mantenimiento.reservas-confirmadas`) | `reservaId` int, `vehiculoId` int, `fechaInicio` string ISO, `fechaFin` string ISO |
| `mantenimiento.resultado` | mantenimiento-service | rental-service (`reservas.mantenimiento-resultado`) | `reservaId` int, `vehiculoId` int, `resultado` `REALIZADO` \| `NO_REALIZADO` |

```json
{ "reservaId": 150, "vehiculoId": 15, "fechaInicio": "2026-10-10T10:00:00", "fechaFin": "2026-10-15T10:00:00" }
{ "reservaId": 150, "vehiculoId": 15, "resultado": "REALIZADO" }
```

La respuesta gRPC de `CrearReserva` **no** espera el mantenimiento: publica el
evento y responde. Mantenimiento Service registra la solicitud con `reservaId`
único, simula el procesamiento durante dos segundos y guarda el resultado antes
de publicar `mantenimiento.resultado`. El resultado predeterminado es
`REALIZADO`; se puede configurar `RESULTADO_MANTENIMIENTO=NO_REALIZADO` para
probar el otro resultado. `DEMORA_MANTENIMIENTO_SEGUNDOS` permite ajustar la
demora y debe ser menor a 60 segundos para no perder la conexión con RabbitMQ.

El procesamiento es idempotente: un evento duplicado no crea otra solicitud.
Si el resultado ya se guardó pero falló su publicación, al volver a publicar
`reserva.confirmada` se reutiliza el resultado persistido y se publica de nuevo.
El consumidor de Rental Service actualiza la reserva correspondiente.

## Cómo usarlo en un servicio

```python
from eventos import broker, contratos

# Publicar (por ejemplo, al final de CrearVehiculo, después del commit)
broker.publicar(
    contratos.VERIFICACION_SOLICITADA,
    {"vehiculoId": vehiculo["id"], "patente": vehiculo["patente"]},
)

# Consumir (en main(), antes de server.wait_for_termination())
def al_recibir_resultado(payload, evento):
    ...  # actualizar la base

broker.escuchar(
    contratos.COLA_VEHICULOS_VERIFICACION,
    {contratos.VERIFICACION_RESULTADO: al_recibir_resultado},
)
```

Un servicio nuevo necesita:

- `pika==1.3.2` en su `requirements.txt`;
- en `docker-compose.yml`: el volumen `./eventos:/app/eventos`, las variables
  `RABBITMQ_URL` y `SERVICIO`, y `depends_on: rabbitmq: condition: service_healthy`.

Copiá lo que tienen `vehicle_service` y `rental_service`.

## Servicios y bases nuevas

Cada base nueva se agrega junto con el servicio que la usa, en la rama de quien
lo implementa. Los puertos quedan reservados acá para no chocar en los merges:

| Servicio | Base | Puerto en el host | Tablas |
|---|---|---|---|
| `registros-service` | `registros_db` | `5435` | `patentes_robadas` (verificación), `titularidades` (externos) |
| `mantenimiento-service` | `mantenimiento_db` | `5436` | `solicitudes_mantenimiento` |

`registros-service` lo crea quien implementa la verificación de vehículos. La
validación de titularidad se suma después sobre ese mismo servicio y la misma
base.

Los `init.sql` solo corren cuando el volumen de la base es nuevo. Después de
traer un cambio de esquema hay que regenerar las bases con
`docker compose down -v` (borra los datos y los seeds los vuelven a cargar).

## Reglas para consumidores

1. **Idempotencia.** RabbitMQ garantiza entrega *al menos una vez*, así que
   el mismo evento puede llegar dos veces. Procesarlo de nuevo no tiene que
   duplicar datos. Por ejemplo, actualizar por `vehiculoId` en vez de
   insertar, o usar `UNIQUE (reservaId)` en la tabla de solicitudes.
2. **Si el manejador termina bien, el mensaje se confirma (ack). Si lanza una
   excepción, va a `rentar.errores`** y no se reintenta en bucle. Desde la
   consola de RabbitMQ se puede ver qué falló.
3. **Manejadores cortos.** Si simulan una demora (mantenimiento), que sean
   unos pocos segundos. Más de ~60 s corta la conexión por falta de
   heartbeat.
4. **Publicar después del commit.** Si se publica antes y la transacción
   falla, otros servicios reaccionan a algo que no pasó. Si la publicación
   falla después del commit, se registra en el log. Para el TP no se
   implementa un outbox.

## Probar sin depender de otro servicio

Para publicar un evento a mano (los valores numéricos viajan como números):

```bash
docker compose exec rental_service python -m eventos.publicar \
    reserva.confirmada reservaId=1 vehiculoId=2 \
    fechaInicio=2026-11-01T10:00:00 fechaFin=2026-11-05T10:00:00
```

Si el payload no cumple el contrato, falla antes de publicar:

```text
ValueError: mantenimiento.resultado: faltan los campos vehiculoId
```

En la consola (http://localhost:15672, pestaña *Queues*) se ve cuántos
mensajes esperan en cada cola. Desde ahí también se puede publicar un evento
(*Exchanges → rentar.eventos → Publish message*) o leer los que quedaron en
`rentar.errores`.
