// Resultado de la verificación policial de la patente (Hito 3). No es un
// estado operativo: un vehículo ROBADO conserva su EstadoVehiculo pero queda
// inhabilitado para nuevas reservas.
export enum VerificacionVehiculo {
  PENDIENTE = 'PENDIENTE',
  VALIDADO = 'VALIDADO',
  ROBADO = 'ROBADO',
}
