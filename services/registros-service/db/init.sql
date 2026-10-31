-- Registro policial simulado: patentes con denuncia de robo vigente. Es un
-- sistema externo a Rentar; solo Registros Service lo consulta. Las patentes
-- se guardan normalizadas (mayúsculas, sin espacios ni guiones).
CREATE TABLE IF NOT EXISTS patentes_robadas (
    patente VARCHAR PRIMARY KEY,
    "fechaDenuncia" DATE NOT NULL,
    descripcion VARCHAR
);

-- Registro de titularidad simulado (como el del registro automotor): quién
-- es el titular de cada patente. Lo consulta la validación de titularidad de
-- los vehículos de propietarios externos.
CREATE TABLE IF NOT EXISTS titularidades (
    patente VARCHAR PRIMARY KEY,
    documento VARCHAR NOT NULL,
    titular VARCHAR NOT NULL
);
