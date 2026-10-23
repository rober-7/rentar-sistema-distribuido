-- Denuncias de prueba. Registrar un vehículo con alguna de estas patentes
-- produce el resultado ROBADO; cualquier otra patente da VALIDADO.
INSERT INTO patentes_robadas (patente, "fechaDenuncia", descripcion)
VALUES
    ('AD123RB', '2026-08-14', 'Robo en vía pública, CABA'),
    ('AE456RB', '2026-09-02', 'Robo a mano armada, Lanús'),
    ('AF789RB', '2026-10-01', 'Hurto en estacionamiento, Avellaneda'),
    ('RBO123', '2025-12-20', 'Robo, patente de formato anterior')
ON CONFLICT (patente) DO NOTHING;
