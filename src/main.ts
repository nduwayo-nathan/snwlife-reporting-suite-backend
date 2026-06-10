import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ?? 3000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: false, transform: false }));
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'https://snwlife-reporting-suite.vercel.app',
    ],
  });
  await app.listen(port, host);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
