import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { getDatabaseConfigError } from './config/database.config';

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
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : undefined
  ].filter(Boolean) as string[];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true
  });
  const http = app.getHttpAdapter().getInstance();
  http.get('/', (_req: any, res: any) => {
    res.status(200).json({ status: 'online' });
  });
  app.setGlobalPrefix('api');
  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
