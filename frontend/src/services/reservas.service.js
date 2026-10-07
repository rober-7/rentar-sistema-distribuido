import { apiFetch, errorMessage } from "./api";
const URL = "http://localhost:3000/reservas";
export async function crearReserva(datos) {
  const r = await apiFetch(URL, {
    method: "POST",
    body: JSON.stringify(datos),
  });
  if (!r.ok)
    throw new Error(await errorMessage(r, "Error al crear la reserva"));
  return r.json();
}
export async function cancelarReserva(id) {
  const r = await apiFetch(`${URL}/${id}/cancelar`, { method: "PATCH" });
  if (!r.ok)
    throw new Error(await errorMessage(r, "Error al cancelar la reserva"));
  return r.json();
}
