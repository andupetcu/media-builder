import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter())

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor())

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  )

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Media Builder API')
    .setDescription('Canva-class media builder API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document)

  const port = process.env.API_PORT || 3001
  await app.listen(port)
  // eslint-disable-next-line no-console
  console.log(`API Gateway running on port ${port}`)
}

bootstrap()
