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
    const flatten = (value: unknown): string[] => {
      if (typeof value === 'string') return [value];
      if (Array.isArray(value)) return value.flatMap(flatten);
      if (value && typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>).flatMap(([key, val]) =>
          flatten(val).map(text => key === 'detail' || key === 'non_field_errors' ? text : `${key}: ${text}`)
        );
      }
      return [];
    };
    const errors = flatten(body);
    throw new Error(errors.length ? errors.join(' · ') : `El servidor respondió con un error (HTTP ${response.status}).`);
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
