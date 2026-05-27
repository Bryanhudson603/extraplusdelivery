import { API_BASE_URL } from '@/config/api';
const BASE_URL = `${API_BASE_URL}/api`;

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(status: number, payload?: unknown) {
    super(`Erro na API (${status})`);
    this.status = status;
    this.payload = payload;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options && options.headers ? options.headers : {})
    }
  });

  const contentType = res.headers.get('content-type') || '';
  const raw = await res.text();

  if (!res.ok) {
    let payload: unknown = undefined;
    try {
      if (contentType.includes('application/json')) {
        payload = raw ? JSON.parse(raw) : undefined;
      } else {
        payload = raw;
      }
    } catch {
      payload = raw;
    }
    throw new ApiError(res.status, payload);
  }

  if (!contentType.includes('application/json')) {
    if (!raw.trim()) return undefined as T;
    throw new ApiError(res.status, {
      message: 'Resposta não é JSON',
      body: raw.slice(0, 500)
    });
  }

  if (!raw.trim()) return undefined as T;

  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    throw new ApiError(res.status, {
      message: 'Resposta JSON inválida',
      detail: e instanceof Error ? e.message : String(e),
      body: raw.slice(0, 500)
    });
  }
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

export async function checkBackend(): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || API_BASE_URL;
  const res = await fetch(`${apiUrl}/api/health`);
  const raw = await res.text();
  try {
    console.log(JSON.parse(raw));
  } catch {
    console.log(raw);
  }
}
