import { NextResponse } from 'next/server';

function normalizeBackendBase(raw: string): string {
  let base = raw.trim().replace(/\/$/, '');
  if (base.endsWith('/api')) {
    base = base.slice(0, -4);
  }
  return base;
}

async function proxy(request: Request, params: { path: string[] }) {
  const requestUrl = new URL(request.url);
  const isLocalhost = requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1';
  const backendEnv = process.env.BACKEND_URL;

  if (!backendEnv && !isLocalhost) {
    return NextResponse.json(
      { error: 'BACKEND_URL não configurado no ambiente' },
      { status: 500 }
    );
  }

  const backendBase = normalizeBackendBase(backendEnv || 'http://localhost:3000');

  const path = Array.isArray(params.path) ? params.path.join('/') : '';
  const targetUrl = `${backendBase}/api/${path}${requestUrl.search}`;

  let body: BodyInit | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const contentType = request.headers.get('content-type') || '';
    if (
      contentType.includes('application/json') ||
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.startsWith('text/')
    ) {
      body = await request.text();
    } else {
      body = await request.arrayBuffer();
    }
  }

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.delete('connection');

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: 'manual'
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'Falha ao conectar no backend', targetUrl },
      { status: 502 }
    );
  }

  const upstreamContentType = upstream.headers.get('content-type') || '';
  if (upstreamContentType.includes('application/json')) {
    const raw = await upstream.text();
    if (!raw.trim()) {
      return NextResponse.json(null, { status: upstream.status });
    }
    try {
      const parsed = JSON.parse(raw);
      return NextResponse.json(parsed, { status: upstream.status });
    } catch (e) {
      return NextResponse.json(
        {
          error: 'Upstream retornou JSON inválido',
          detail: e instanceof Error ? e.message : String(e),
          status: upstream.status,
          targetUrl,
          body: raw.slice(0, 500)
        },
        { status: 502 }
      );
    }
  }

  const responseHeaders = new Headers(upstream.headers);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders
  });
}

export async function GET(request: Request, ctx: { params: { path: string[] } }) {
  return proxy(request, ctx.params);
}
export async function POST(request: Request, ctx: { params: { path: string[] } }) {
  return proxy(request, ctx.params);
}
export async function PUT(request: Request, ctx: { params: { path: string[] } }) {
  return proxy(request, ctx.params);
}
export async function PATCH(request: Request, ctx: { params: { path: string[] } }) {
  return proxy(request, ctx.params);
}
export async function DELETE(request: Request, ctx: { params: { path: string[] } }) {
  return proxy(request, ctx.params);
}
export async function OPTIONS(request: Request, ctx: { params: { path: string[] } }) {
  return proxy(request, ctx.params);
}
