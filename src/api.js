const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function api(path, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.includes("/user/login")) {
    localStorage.clear();
    location.reload();
  }
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
