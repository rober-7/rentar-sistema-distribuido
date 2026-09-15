export function calcularImporte(
  precioDiario: number,
  fechaInicio: Date,
  fechaFinalizacion: Date,
): number {
  // Cada bloque de 24 horas iniciado se cobra como un día completo.
  const dias = Math.ceil(
    (fechaFinalizacion.getTime() - fechaInicio.getTime()) / 86_400_000,
  );
  const precioEnCentavos = Math.round(precioDiario * 100);
  return (precioEnCentavos * dias) / 100;
}
