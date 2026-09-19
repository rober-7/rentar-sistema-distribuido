const API_URL = 'http://localhost:3000/clientes';

const extraerMensajeError = async (respuesta, mensajePorDefecto) => {
  const errorData = await respuesta.json().catch(() => null);
  if (!errorData) return mensajePorDefecto;
  return Array.isArray(errorData.message)
    ? errorData.message.join('\n')
    : errorData.message || mensajePorDefecto;
};

// GET para obtener todos los clientes
export const obtenerClientes = async () => {
  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) {
      throw new Error('Error en la respuesta de red');
    }
    return await respuesta.json();
  } catch (error) {
    console.error('Hubo un problema al traer los clientes:', error);
    return [];
  }
};

// POST para el alta de clientes
export const crearCliente = async (datosCliente) => {
  const respuesta = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datosCliente),
  });

  if (!respuesta.ok) {
    throw new Error(await extraerMensajeError(respuesta, 'Error al crear el cliente'));
  }

  return respuesta.json();
};

// PATCH para modificar un cliente
export const modificarCliente = async (id, datosCliente) => {
  const respuesta = await fetch(`${API_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datosCliente),
  });

  if (!respuesta.ok) {
    throw new Error(await extraerMensajeError(respuesta, 'Error al modificar el cliente'));
  }

  return respuesta.json();
};

// DELETE para la baja lógica del cliente
export const bajaCliente = async (id) => {
  const respuesta = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
  });

  if (!respuesta.ok) {
    throw new Error(await extraerMensajeError(respuesta, 'Error al dar de baja al cliente'));
  }

  return true;
};
