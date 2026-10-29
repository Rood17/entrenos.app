/**
 * API URL is configurable at Netlify build time.
 * Never point a deployed site at localhost.
 */
const configuredUrl = import.meta.env.VITE_API_URL?.trim();
const base = (configuredUrl || 'https://entrenos-backendservices.onrender.com/api/v1').replace(/\/+$/, '');

const REFRESH_KEY = 'entrenos.refresh.v1';
let activeAccessToken: string | null = null;
let inflightRefresh: Promise<string | null> | null = null;

export function rememberSession(access: string, refresh: string, persistent: boolean) {
  activeAccessToken = access;
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  (persistent ? localStorage : sessionStorage).setItem(REFRESH_KEY, refresh);
}
export function clearSession() {
  activeAccessToken = null;
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}
export function hasRememberedSession() {
  return Boolean(localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY));
}
async function getNewAccessToken(): Promise<string | null> {
  const refresh = sessionStorage.getItem(REFRESH_KEY) || localStorage.getItem(REFRESH_KEY);
  if (!refresh) return null;
  if (inflightRefresh) return inflightRefresh;
  inflightRefresh = (async () => {
    try {
      const response = await fetch(base + '/auth/refresh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (!response.ok) { clearSession(); return null; }
      const result = await response.json() as { access: string; refresh?: string };
      activeAccessToken = result.access;
      if (result.refresh) {
        const persistent = Boolean(localStorage.getItem(REFRESH_KEY));
        rememberSession(result.access, result.refresh, persistent);
      }
      return result.access;
    } catch {
      return null;
    } finally { inflightRefresh = null; }
  })();
  return inflightRefresh;
}
export async function restoreSession(): Promise<string | null> {
  if (!hasRememberedSession()) return null;
  return getNewAccessToken();
}

export async function api<T>(path: string, options: RequestInit = {}, accessToken?: string): Promise<T> {
  let response: Response;
  const endpoint = base + (path.startsWith('/') ? path : '/' + path);
  const requestWithToken = (token: string | null) => fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
    },
  });
  try {
    response = await requestWithToken(accessToken || activeAccessToken);
    if (response.status === 401 && hasRememberedSession()) {
      const renewed = await getNewAccessToken();
      if (renewed) response = await requestWithToken(renewed);
    }
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
