import { config } from 'dotenv';
config(); // Cargar variables de entorno

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3002', 
      'http://localhost:3003',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3003'
    ],
    credentials: true,
  });
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 NestJS API running on http://localhost:${port}`);
  console.log(`🎫 Seat.io Public Key: ${process.env.SEATIO_PUBLIC_KEY?.substring(0, 8)}...`);
  console.log(`🎨 Custom Booking System ready!`);
}
bootstrap();