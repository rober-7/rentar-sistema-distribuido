-- Denuncias de prueba. Registrar un vehículo con alguna de estas patentes
-- produce el resultado ROBADO; cualquier otra patente da VALIDADO.
INSERT INTO patentes_robadas (patente, "fechaDenuncia", descripcion)
VALUES
    ('AD123RB', '2026-08-14', 'Robo en vía pública, CABA'),
    ('AE456RB', '2026-09-02', 'Robo a mano armada, Lanús'),
    ('AF789RB', '2026-10-01', 'Hurto en estacionamiento, Avellaneda'),
    ('RBO123', '2025-12-20', 'Robo, patente de formato anterior')
ON CONFLICT (patente) DO NOTHING;

-- Titulares de prueba para el alta de vehículos externos. El documento
-- 32619541 es el del cliente demo (Martín Fernández):
--   AD777EX, AE888EX -> pasan las dos validaciones.
--   AF789RB          -> es suyo pero está denunciado: patente RECHAZADO.
--   AG555EX          -> es de otra persona: titularidad RECHAZADO.
-- Una patente que no figura en esta tabla también da titularidad RECHAZADO.
INSERT INTO titularidades (patente, documento, titular)
VALUES
    ('AD777EX', '32619541', 'Martín Fernández'),
    ('AE888EX', '32619541', 'Martín Fernández'),
    ('AF789RB', '32619541', 'Martín Fernández'),
    ('AG555EX', '28444555', 'Laura Gómez')
ON CONFLICT (patente) DO NOTHING;
