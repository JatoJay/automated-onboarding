import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const productionOrigins: (string | RegExp)[] = [
    'https://onboarding-frontend-pbv4p5a6zq-uc.a.run.app',
    /\.run\.app$/,
  ];
  if (process.env.FRONTEND_URL) {
    productionOrigins.unshift(process.env.FRONTEND_URL);
  }

  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? productionOrigins
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:3002',
          'http://localhost:5173',
        ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Onboarding API')
    .setDescription('AI-powered employee onboarding platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
