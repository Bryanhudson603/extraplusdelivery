import { API_BASE_URL } from '@/config/api';
const BASE_URL = `${API_BASE_URL}/api`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options && options.headers ? options.headers : {})
    }
  });

  if (!res.ok) {
    throw new Error(`Erro na API (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get<T>(path: string) {
    return request<T>(path);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  },
  put<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    });
  },
  delete<T>(path: string) {
    return request<T>(path, {
      method: 'DELETE'
    });
  }
};
