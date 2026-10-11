-- Credencial de demostración:
--   email: mfernandez@gmail.com
--   password: ClienteRentar2026!
INSERT INTO usuarios (
    id,
    documento,
    nombre,
    apellido,
    email,
    "passwordHash",
    rol,
    telefono,
    "fechaNacimiento",
    activo
)
SELECT
    1001,
    '32619541',
    'Martín',
    'Fernández',
    'mfernandez@gmail.com',
    '$2b$12$yAnq2k5AacNANAQioYGfMeAE2ZqzOJKgN6Az111hVITgv4WDU7tIy',
    'CLIENTE',
    '1148265948',
    DATE '1990-05-15',
    TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM usuarios
    WHERE id = 1001
       OR documento = '32619541'
       OR email = 'mfernandez@gmail.com'
);

SELECT setval(
    pg_get_serial_sequence('usuarios', 'id'),
    GREATEST((SELECT COALESCE(MAX(id), 1) FROM usuarios), 1),
    TRUE
);
