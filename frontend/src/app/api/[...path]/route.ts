import { NextResponse } from 'next/server';

async function proxy(request: Request, params: { path: string[] }) {
  const backendBase =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_URL_PROD ||
    'http://localhost:3000';

  const path = Array.isArray(params.path) ? params.path.join('/') : '';
  const targetUrl = `${backendBase.replace(/\/$/, '')}/api/${path}`;

  let body: ArrayBuffer | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.arrayBuffer();
  }

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

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

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('content-encoding');

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
