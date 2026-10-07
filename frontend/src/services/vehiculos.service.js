import { apiFetch, errorMessage } from "./api";
const URL = "http://localhost:3000/vehiculos";
async function request(path = "", options = {}) {
  const r = await apiFetch(`${URL}${path}`, options);
  if (!r.ok) throw new Error(await errorMessage(r, "Error en vehículos"));
  return r.json();
}
export const obtenerVehiculos = () => request();
export const crearVehiculo = (d) =>
  request("", { method: "POST", body: JSON.stringify(d) });
export const modificarVehiculo = (id, d) =>
  request(`/${id}`, { method: "PATCH", body: JSON.stringify(d) });
export const bajaVehiculo = (id) => request(`/${id}`, { method: "DELETE" });
