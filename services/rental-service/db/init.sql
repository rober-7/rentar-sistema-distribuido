CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS reservas (
    id SERIAL PRIMARY KEY,
    vehiculo_id INTEGER NOT NULL,
    cliente_id INTEGER NOT NULL,
    "fechaInicio" TIMESTAMPTZ NOT NULL,
    "fechaFinalizacion" TIMESTAMPTZ NOT NULL,
    "importeTotal" NUMERIC(10, 2) NOT NULL CHECK ("importeTotal" >= 0),
    estado VARCHAR NOT NULL DEFAULT 'CONFIRMADA'
        CHECK (estado IN ('CONFIRMADA', 'CANCELADA', 'FINALIZADA', 'FINALIZADO')),
    mantenimiento_resultado VARCHAR
        CHECK (mantenimiento_resultado IN ('REALIZADO', 'NO_REALIZADO')),
    kilometraje_final INTEGER CHECK (kilometraje_final >= 0),
    estado_general VARCHAR
        CHECK (estado_general IN ('EXCELENTE', 'BUENO', 'DANIO_LEVE', 'DANIO_GRAVE')),
    fecha_devolucion TIMESTAMPTZ,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    "creadoEn" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "actualizadoEn" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ("fechaFinalizacion" > "fechaInicio")
);

-- PostgreSQL rechaza atómicamente dos reservas confirmadas y activas del
-- mismo vehículo cuyos intervalos se superpongan. El rango [) permite que una
-- reserva empiece exactamente cuando termina la anterior.
ALTER TABLE reservas
    ADD CONSTRAINT reservas_sin_superposicion
    EXCLUDE USING gist (
        vehiculo_id WITH =,
        tstzrange("fechaInicio", "fechaFinalizacion", '[)') WITH &&
    )
    WHERE (activo = TRUE AND estado = 'CONFIRMADA');

CREATE INDEX IF NOT EXISTS idx_reservas_cliente_id ON reservas (cliente_id);
CREATE INDEX IF NOT EXISTS idx_reservas_vehiculo_id ON reservas (vehiculo_id);
