import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = [
    'http://localhost:3001',
    'https://extraplusdelivery.vercel.app'
  ];
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
