const KEY = "rentar_sesion";
export const obtenerSesion = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
};
export const guardarSesion = (s) =>
  localStorage.setItem(KEY, JSON.stringify(s));
export const cerrarSesion = () => localStorage.removeItem(KEY);
export const token = () => obtenerSesion()?.accessToken ?? null;
export const usuarioActual = () => obtenerSesion()?.usuario ?? null;
