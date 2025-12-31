export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("accessToken") || window.localStorage.getItem("access_token");
}

export async function apiFetch(input: string, init: RequestInit = {}) {
  const token = getAccessToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (typeof window !== "undefined") headers.set("x-pathname", window.location.pathname);
  // Default: avoid unexpected caching for API/data requests (can be overridden via init.cache).
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");
  // Jangan set Content-Type untuk FormData (biar boundary otomatis)
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!headers.has("Content-Type") && init.body && !isFormData) headers.set("Content-Type", "application/json");
  // Ensure cookies are sent on same-origin calls (default is "same-origin", but keep explicit).
  const res = await fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? "same-origin",
    cache: init.cache ?? "no-store",
  });
  return res;
}
