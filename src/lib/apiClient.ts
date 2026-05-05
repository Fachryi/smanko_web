// ============================================================
// API Client – centralised Fetch wrapper
// ============================================================

const BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('smanko_token')
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${endpoint}`, { ...options, headers })
  const json = await res.json()

  if (!res.ok || json.status === 'error') {
    throw new Error(json.message || `HTTP ${res.status}`)
  }
  return json as T
}

export const api = {
  get:      <T>(url: string)                     => request<T>(url),
  post:     <T>(url: string, body: unknown)      => request<T>(url, { method: 'POST',   body: JSON.stringify(body) }),
  put:      <T>(url: string, body: unknown)      => request<T>(url, { method: 'PUT',    body: JSON.stringify(body) }),
  delete:   <T>(url: string)                     => request<T>(url, { method: 'DELETE' }),
  postForm: <T>(url: string, body: FormData)     => request<T>(url, { method: 'POST',   body }),
}
