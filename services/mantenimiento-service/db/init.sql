CREATE TABLE IF NOT EXISTS solicitudes_mantenimiento (
    id SERIAL PRIMARY KEY,
    reserva_id INTEGER NOT NULL UNIQUE,
    vehiculo_id INTEGER NOT NULL,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    resultado VARCHAR
        CHECK (resultado IN ('REALIZADO', 'NO_REALIZADO')),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (fecha_fin > fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_mantenimiento_vehiculo_id
    ON solicitudes_mantenimiento (vehiculo_id);
