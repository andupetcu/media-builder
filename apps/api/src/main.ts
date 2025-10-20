import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import { NestExpressApplication } from '@nestjs/platform-express'
import * as path from 'path'
import { json, urlencoded } from 'express'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // Increase body size limit to handle large payloads (e.g., base64 thumbnails)
  app.use(json({ limit: '50mb' }))
  app.use(urlencoded({ limit: '50mb', extended: true }))

  // Serve static assets since Nginx Proxy Manager is on a different server
  const assetsRoot = process.env.ASSETS_ROOT || '/data/assets'
  app.useStaticAssets(path.join(assetsRoot, 'public'), {
    prefix: '/',
    setHeaders: res => {
      // Don't set CORS headers here - they're set globally by enableCors
      res.set('Cache-Control', 'public, max-age=31536000, immutable')
      res.set('X-Content-Type-Options', 'nosniff')
    },
  })

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
  const host = process.env.API_HOST || '10.0.0.60'
  await app.listen(port, host)
  // eslint-disable-next-line no-console
  console.log(`API Gateway running on ${host}:${port}`)
}

bootstrap()
