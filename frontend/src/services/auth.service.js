import { apiFetch, errorMessage } from "./api";
const URL = "http://localhost:3000/auth";
export async function login(email, password) {
  const r = await apiFetch(`${URL}/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok)
    throw new Error(await errorMessage(r, "No se pudo iniciar sesión"));
  return r.json();
}
export async function logout() {
  await apiFetch(`${URL}/logout`, { method: "POST" }).catch(() => {});
}
