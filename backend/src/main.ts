import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { getDatabaseConfigError } from './config/database.config';

function expandAllowedOrigins(rawOrigins: string[]): string[] {
  const expanded = new Set<string>();

  for (const rawOrigin of rawOrigins) {
    const origin = String(rawOrigin || '').trim();
    if (!origin) continue;
    expanded.add(origin);

    try {
      const parsed = new URL(origin);
      const host = parsed.hostname.toLowerCase();
      if (host.startsWith('www.')) {
        expanded.add(`${parsed.protocol}//${host.slice(4)}${parsed.port ? `:${parsed.port}` : ''}`);
      } else if (host.includes('.')) {
        expanded.add(`${parsed.protocol}//www.${host}${parsed.port ? `:${parsed.port}` : ''}`);
      }
    } catch {
    }
  }

  return Array.from(expanded);
}

async function bootstrap() {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET obrigatório em produção');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL obrigatório em produção');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL obrigatório em produção');
  }
  if (!process.env.PLATFORM_ADMIN_USER || !process.env.PLATFORM_ADMIN_PASS_HASH) {
    throw new Error('PLATFORM_ADMIN_USER e PLATFORM_ADMIN_PASS_HASH são obrigatórios');
  }
  const databaseConfigError = getDatabaseConfigError();
  if (databaseConfigError) {
    throw new Error(
      `${databaseConfigError} Verifique as variáveis DATABASE_URL/DB_HOST no Render antes do deploy.`
    );
  }
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  const allowedOrigins = expandAllowedOrigins([
    process.env.FRONTEND_URL,
    process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : undefined
  ].filter(Boolean) as string[]);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true
  });
  const http = app.getHttpAdapter().getInstance();
  http.get('/', (_req: any, res: any) => {
    res.status(200).json({ status: 'online' });
  });
  // O redirect URI autorizado no Google Cloud Console e o valor real de
  // GOOGLE_CALLBACK_URL ja usados em producao nao levam o prefixo /api.
  // Excluir essa rota do prefixo global evita ter que trocar o redirect
  // URI cadastrado no Google.
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'auth/google/callback', method: RequestMethod.GET }]
  });
  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
