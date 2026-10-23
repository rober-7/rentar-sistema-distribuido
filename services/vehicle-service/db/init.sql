CREATE TABLE IF NOT EXISTS vehiculos (
    id SERIAL PRIMARY KEY,
    patente VARCHAR NOT NULL UNIQUE,
    marca VARCHAR NOT NULL,
    modelo VARCHAR NOT NULL,
    anio INTEGER NOT NULL,
    color VARCHAR,
    "tipoVehiculo" VARCHAR NOT NULL
        CHECK ("tipoVehiculo" IN ('SEDAN', 'SUV', 'PICKUP', 'COUPE', 'HATCHBACK')),
    "precioDiario" NUMERIC(10, 2) NOT NULL CHECK ("precioDiario" > 0),
    estado VARCHAR NOT NULL DEFAULT 'DISPONIBLE'
        CHECK (estado IN ('DISPONIBLE', 'RESERVADO', 'EN_ALQUILER')),
    -- Resultado de la verificación policial de la patente (Hito 3); NULL
    -- mientras está pendiente. No es un estado operativo: un vehículo ROBADO
    -- conserva su estado pero queda inhabilitado para nuevas operaciones.
    verificacion VARCHAR CHECK (verificacion IN ('VALIDADO', 'ROBADO')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    "creadoEn" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "actualizadoEn" TIMESTAMPTZ NOT NULL DEFAULT now()
);
