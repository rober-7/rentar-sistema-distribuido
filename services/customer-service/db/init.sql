CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    documento VARCHAR NOT NULL UNIQUE,
    nombre VARCHAR NOT NULL,
    apellido VARCHAR NOT NULL,
    email VARCHAR NOT NULL UNIQUE,
    "passwordHash" VARCHAR NOT NULL,
    rol VARCHAR NOT NULL DEFAULT 'CLIENTE'
        CHECK (rol IN ('ADMIN', 'CLIENTE')),
    telefono VARCHAR,
    "fechaNacimiento" DATE NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    "creadoEn" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "actualizadoEn" TIMESTAMPTZ NOT NULL DEFAULT now()
);
