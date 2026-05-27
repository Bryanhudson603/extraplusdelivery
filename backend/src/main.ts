import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (origin === 'http://localhost:3001') {
        return callback(null, true);
      }
      if (origin === 'https://extraplusdelivery.vercel.app') {
        return callback(null, true);
      }
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(null, false);
    },
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
