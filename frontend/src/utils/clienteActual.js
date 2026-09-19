const STORAGE_KEY = 'rentar_cliente_actual';

// Mientras el sistema no tenga login, el cliente se identifica eligiéndose
// a sí mismo de la lista de clientes registrados. Se persiste en el
// navegador para no tener que re-seleccionarlo en cada pantalla.
export function obtenerClienteActual() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function guardarClienteActual(cliente) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cliente));
  } catch {
    // localStorage no disponible (modo privado, etc.): la selección no persiste.
  }
}

export function limpiarClienteActual() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // sin acción posible
  }
}
