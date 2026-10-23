-- Registro policial simulado: patentes con denuncia de robo vigente. Es un
-- sistema externo a Rentar; solo Registros Service lo consulta. Las patentes
-- se guardan normalizadas (mayúsculas, sin espacios ni guiones).
CREATE TABLE IF NOT EXISTS patentes_robadas (
    patente VARCHAR PRIMARY KEY,
    "fechaDenuncia" DATE NOT NULL,
    descripcion VARCHAR
);
