# Alta de reserva — Hito 1, punto 4

`POST /reservas`, documentado en `/api/docs`.

```json
{
  "cliente": 101,
  "vehiculo": 202,
  "fechaInicio": "2027-01-20T10:00:00-03:00",
  "fechaFinalizacion": "2027-01-22T10:00:00-03:00"
}
```

Los identificadores deben existir y las fechas del ejemplo deben ajustarse para
que el inicio sea futuro. La respuesta 201 contiene la reserva CONFIRMADA y su
importeTotal. El importe se calcula en el servidor y queda guardado en la reserva.

## Reglas

- 400: IDs o fechas inválidos, inicio no futuro, finalización no posterior al inicio.
- 404: cliente o vehículo inexistente.
- 409: cliente o vehículo inactivo, vehículo EN_ALQUILER o período ocupado.
- Sólo las reservas activas y CONFIRMADAS bloquean fechas. CANCELADA no bloquea.
- Los intervalos son [inicio, fin): se permiten reservas consecutivas.
- El TP no especifica cómo cobrar fracciones de día. Se adoptan bloques de 24 horas
  redondeados hacia arriba, multiplicados por el precio diario en centavos.
- RESERVADO no bloquea por sí solo todos los períodos futuros: se consultan las
  fechas de las reservas. EN_ALQUILER se considera no disponible, ya que todavía
  no hay un registro de alquiler con fecha de devolución que permita determinar
  cuándo se liberará. La consulta de disponibilidad sigue el mismo criterio.
- El alta cambia el estado del vehículo a RESERVADO dentro de la misma transacción
  que guarda la reserva. La reserva confirmada indica qué período está ocupado.
- La transacción bloquea el vehículo antes de consultar solapamientos e insertar.
  Dos altas simultáneas por este servicio no pueden confirmar el mismo período.
- El cliente se recibe como ID porque este módulo todavía no tiene autenticación.

## Pruebas con PostgreSQL

Con PostgreSQL de `docker compose` en ejecución, desde `backend` en PowerShell:

```powershell
$env:RESERVAS_TEST_DB = '1'
npm test -- --runInBand reservas.integration.spec.ts
```

Las pruebas crean y eliminan un esquema exclusivo `reservas_test_*` sin modificar
las tablas existentes. Sin RESERVAS_TEST_DB=1, la suite se omite. Se puede configurar
la conexión mediante RESERVAS_TEST_HOST, RESERVAS_TEST_PORT, RESERVAS_TEST_USER,
RESERVAS_TEST_PASSWORD y RESERVAS_TEST_DATABASE.
