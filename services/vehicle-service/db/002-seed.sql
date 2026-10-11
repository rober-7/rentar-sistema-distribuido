INSERT INTO vehiculos (
    id,
    patente,
    marca,
    modelo,
    anio,
    color,
    "tipoVehiculo",
    "precioDiario",
    estado,
    activo
)
SELECT *
FROM (
    VALUES
        (1001, 'AA100AA', 'Toyota', 'Corolla', 2023, 'Gris', 'SEDAN', 30000.00, 'DISPONIBLE', TRUE),
        (1002, 'AB200BB', 'Ford', 'Territory', 2024, 'Negro', 'SUV', 45000.00, 'DISPONIBLE', TRUE),
        (1003, 'AC300CC', 'Volkswagen', 'Amarok', 2022, 'Blanco', 'PICKUP', 55000.00, 'DISPONIBLE', TRUE)
) AS demo(
    id,
    patente,
    marca,
    modelo,
    anio,
    color,
    "tipoVehiculo",
    "precioDiario",
    estado,
    activo
)
WHERE NOT EXISTS (
    SELECT 1
    FROM vehiculos
    WHERE vehiculos.id = demo.id
       OR vehiculos.patente = demo.patente
);

SELECT setval(
    pg_get_serial_sequence('vehiculos', 'id'),
    GREATEST((SELECT COALESCE(MAX(id), 1) FROM vehiculos), 1),
    TRUE
);
