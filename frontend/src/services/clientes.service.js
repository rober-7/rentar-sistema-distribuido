import { apiFetch, errorMessage } from "./api";
const URL = "http://localhost:3000/clientes";
export async function obtenerClientes() {
  const r = await apiFetch(URL);
  if (!r.ok)
    throw new Error(await errorMessage(r, "Error al obtener clientes"));
  return r.json();
}
export async function crearCliente(datos) {
  const r = await apiFetch(URL, {
    method: "POST",
    body: JSON.stringify(datos),
  });
  if (!r.ok)
    throw new Error(await errorMessage(r, "Error al crear el cliente"));
  return r.json();
}
export async function modificarCliente(id, datos) {
  const r = await apiFetch(`${URL}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(datos),
  });
  if (!r.ok)
    throw new Error(await errorMessage(r, "Error al modificar el cliente"));
  return r.json();
}
export async function bajaCliente(id) {
  const r = await apiFetch(`${URL}/${id}`, { method: "DELETE" });
  if (!r.ok)
    throw new Error(await errorMessage(r, "Error al dar de baja el cliente"));
}
