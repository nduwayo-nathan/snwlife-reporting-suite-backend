import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ?? 3000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(port, host);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
