import { apiFetch, errorMessage } from "./api";
const URL = "http://localhost:3000/reservas";
const GRAPHQL_URL = "http://localhost:3000/graphql";

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
export async function registrarDevolucion({
  reservaId,
  kilometrajeFinal,
  estadoGeneral,
}) {
  const query = `
    mutation RegistrarDevolucion($input: RegistrarDevolucionInput!) {
      registrarDevolucion(input: $input) {
        reservaId
        kilometrajeFinal
        estadoGeneral
        estado
        fechaDevolucion
        mensaje
      }
    }
  `;
  const r = await apiFetch(GRAPHQL_URL, {
    method: "POST",
    body: JSON.stringify({
      query,
      variables: {
        input: {
          reservaId: Number(reservaId),
          kilometrajeFinal: Number(kilometrajeFinal),
          estadoGeneral,
        },
      },
    }),
  });
  const payload = await r.json().catch(() => null);
  if (payload?.errors?.length) {
    const msg = payload.errors[0]?.message;
    throw new Error(
      Array.isArray(msg)
        ? msg.join("\n")
        : msg || "Error al registrar la devolución",
    );
  }
  if (!r.ok || !payload?.data?.registrarDevolucion) {
    throw new Error("Error al registrar la devolución del vehículo");
  }
  return payload.data.registrarDevolucion;
}
