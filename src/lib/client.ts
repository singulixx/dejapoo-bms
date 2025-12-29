export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("accessToken") || window.localStorage.getItem("access_token");
}

export async function apiFetch(input: string, init: RequestInit = {}) {
  const token = getAccessToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (typeof window !== "undefined") headers.set("x-pathname", window.location.pathname);
  // Jangan set Content-Type untuk FormData (biar boundary otomatis)
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!headers.has("Content-Type") && init.body && !isFormData) headers.set("Content-Type", "application/json");
  const res = await fetch(input, { ...init, headers });
  return res;
}
