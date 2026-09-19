const API_URL = 'http://localhost:3000/reservas';

const extraerMensajeError = async (respuesta, mensajePorDefecto) => {
  const errorData = await respuesta.json().catch(() => null);
  if (!errorData) return mensajePorDefecto;
  return Array.isArray(errorData.message)
    ? errorData.message.join('\n')
    : errorData.message || mensajePorDefecto;
};

// POST para el alta de una reserva
export const crearReserva = async ({ vehiculo, cliente, fechaInicio, fechaFinalizacion }) => {
  const respuesta = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vehiculo, cliente, fechaInicio, fechaFinalizacion }),
  });

  if (!respuesta.ok) {
    throw new Error(await extraerMensajeError(respuesta, 'Error al crear la reserva'));
  }

  return respuesta.json();
};

// PATCH para cancelar una reserva
export const cancelarReserva = async (id) => {
  const respuesta = await fetch(`${API_URL}/${id}/cancelar`, {
    method: 'PATCH',
  });

  if (!respuesta.ok) {
    throw new Error(await extraerMensajeError(respuesta, 'Error al cancelar la reserva'));
  }

  return respuesta.json();
};
