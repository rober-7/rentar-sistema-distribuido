CREATE TABLE IF NOT EXISTS comprobantes (
    id SERIAL PRIMARY KEY,
    reserva_id INTEGER NOT NULL UNIQUE,
    cliente_id INTEGER NOT NULL,
    vehiculo_id INTEGER NOT NULL,
    kilometraje_final INTEGER NOT NULL CHECK (kilometraje_final >= 0),
    estado_general VARCHAR NOT NULL
        CHECK (estado_general IN ('EXCELENTE', 'BUENO', 'DANIO_LEVE', 'DANIO_GRAVE')),
    importe_base NUMERIC(12, 2) NOT NULL CHECK (importe_base >= 0),
    penalizacion_km NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (penalizacion_km >= 0),
    penalizacion_danios NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (penalizacion_danios >= 0),
    importe_total_final NUMERIC(12, 2) NOT NULL CHECK (importe_total_final >= 0),
    detalle VARCHAR NOT NULL,
    emitido_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comprobantes_cliente_id
    ON comprobantes (cliente_id);
CREATE INDEX IF NOT EXISTS idx_comprobantes_vehiculo_id
    ON comprobantes (vehiculo_id);
