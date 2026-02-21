import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const http = app.getHttpAdapter().getInstance();
  http.get('/', (_req: any, res: any) => {
    res.status(200).json({ status: 'online' });
  });
  app.setGlobalPrefix('api');
  app.enableCors();
  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
