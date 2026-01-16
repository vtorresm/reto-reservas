import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PaymentServiceModule } from './payment-service.module';

async function bootstrap() {
  const logger = new Logger('PaymentService');
  const app = await NestFactory.create(PaymentServiceModule);

  // Configuración global de validación
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Configuración CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  });

  // Configuración de prefijo global
  app.setGlobalPrefix('api/v1');

  // Configuración de documentación Swagger
  const config = new DocumentBuilder()
    .setTitle('Payment Service API')
    .setDescription('API para procesamiento de pagos y facturación')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Obtener configuración del servicio
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3004;
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';

  await app.listen(port);

  logger.log(`🚀 Payment Service iniciado en puerto ${port}`);
  logger.log(`📚 Documentación disponible en: http://localhost:${port}/api/docs`);
  logger.log(`🌍 Entorno: ${nodeEnv}`);

  // Manejo de señales de apagado graceful
  process.on('SIGTERM', async () => {
    logger.log('📴 SIGTERM recibido, apagando graceful...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('📴 SIGINT recibido, apagando graceful...');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('❌ Error iniciando Payment Service:', error);
  process.exit(1);
});