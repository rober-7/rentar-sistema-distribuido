-- Los IDs 1001 coinciden con el cliente y los vehículos demo de las otras
-- bases. Las fechas son relativas al primer arranque para que siempre exista
-- una reserva futura y otra visible en el historial inicial.
INSERT INTO reservas (
    id,
    vehiculo_id,
    cliente_id,
    "fechaInicio",
    "fechaFinalizacion",
    "importeTotal",
    estado,
    activo
)
SELECT
    1001,
    1001,
    1001,
    date_trunc('day', now()) + INTERVAL '7 days 10 hours',
    date_trunc('day', now()) + INTERVAL '10 days 10 hours',
    90000.00,
    'CONFIRMADA',
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM reservas WHERE id = 1001);

INSERT INTO reservas (
    id,
    vehiculo_id,
    cliente_id,
    "fechaInicio",
    "fechaFinalizacion",
    "importeTotal",
    estado,
    activo
)
SELECT
    1002,
    1002,
    1001,
    date_trunc('day', now()) - INTERVAL '10 days' + INTERVAL '10 hours',
    date_trunc('day', now()) - INTERVAL '7 days' + INTERVAL '10 hours',
    135000.00,
    'CONFIRMADA',
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM reservas WHERE id = 1002);

SELECT setval(
    pg_get_serial_sequence('reservas', 'id'),
    GREATEST((SELECT COALESCE(MAX(id), 1) FROM reservas), 1),
    TRUE
);
