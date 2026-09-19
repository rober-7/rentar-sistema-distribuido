export function calcularDias(fechaInicio: Date, fechaFinalizacion: Date): number {
  // Cada bloque de 24 horas iniciado se cobra como un día completo.
  return Math.ceil(
    (fechaFinalizacion.getTime() - fechaInicio.getTime()) / 86_400_000,
  );
}

export function calcularImporte(
  precioDiario: number,
  fechaInicio: Date,
  fechaFinalizacion: Date,
): number {
  const dias = calcularDias(fechaInicio, fechaFinalizacion);
  const precioEnCentavos = Math.round(precioDiario * 100);
  return (precioEnCentavos * dias) / 100;
}
