/**
 * API URL is configurable at Netlify build time.
 * Never point a deployed site at localhost.
 */
const configuredUrl = import.meta.env.VITE_API_URL?.trim();
const base = (configuredUrl || 'https://entrenos-backendservices.onrender.com/api/v1').replace(/\/+$/, '');

export async function api<T>(path: string, options: RequestInit = {}, accessToken?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(base + (path.startsWith('/') ? path : '/' + path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('No pudimos conectar con el servidor de EntreNos. Revisa la URL de la API y la configuración CORS de Render.');
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const detail = typeof body === 'object' && body !== null && 'detail' in body
      ? String((body as { detail: unknown }).detail)
      : '';
    throw new Error(detail || `El servidor respondió con un error (HTTP ${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type User = { id: number; email: string; username: string; first_name: string };
export async function login(email: string, password: string) {
  return api<{ access: string; refresh: string }>('/auth/login/', {
    method: 'POST', body: JSON.stringify({ email, password }),
  });
}
export async function register(username: string, email: string, password: string) {
  return api<User>('/auth/register/', {
    method: 'POST', body: JSON.stringify({ username, email, password }),
  });
}
