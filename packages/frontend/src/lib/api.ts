import { supabase } from './supabase';

const API_PORT = 2026;
const BASE = import.meta.env.VITE_API_URL || `http://127.0.0.1:${API_PORT}`;

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);

  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }

  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const userId = data?.session?.user?.id;
  if (userId) {
    headers.set('X-User-Id', userId);
  }

  return fetch(`${BASE}${path}`, { ...init, headers });
}
