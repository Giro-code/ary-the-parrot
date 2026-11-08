export class ApiError extends Error {
  code: string;
  constructor(code: string) { super(code); this.code = code; }
}
export async function api<T>(path: string, method = "GET", data?: unknown): Promise<T> {
  const response = await fetch(path, { method, credentials: "same-origin", cache: "no-store", headers: method === "GET" ? {} : { "Content-Type": "application/json", "X-Ary-Request": "1" }, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
  const result = await response.json();
  if (!response.ok) throw new ApiError(result.error || "service_unavailable");
  return result as T;
}
