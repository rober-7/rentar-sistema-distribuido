import { token, cerrarSesion } from "../utils/auth";
export async function apiFetch(url, options = {}) {
  const { redirectOnUnauthorized = true, ...fetchOptions } = options;
  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(fetchOptions.headers ?? {}),
    },
  });
  if (response.status === 401 && redirectOnUnauthorized) {
    cerrarSesion();
    window.location.assign("/login");
  }
  return response;
}
export async function errorMessage(response, fallback) {
  const data = await response.json().catch(() => null);
  return Array.isArray(data?.message)
    ? data.message.join("\n")
    : (data?.message ?? fallback);
}
