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

  if (!res.ok) {
    let payload: unknown = undefined;
    try {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        payload = await res.json();
      } else {
        payload = await res.text();
      }
    } catch {
    }
    throw new ApiError(res.status, payload);
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

export async function checkBackend(): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || API_BASE_URL;
  const res = await fetch(`${apiUrl}/api/health`);
  const data = await res.json();
  console.log(data);
}
