import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { OrgsModule } from './orgs/orgs.module'
import { TeamsModule } from './teams/teams.module'
import { DesignsModule } from './designs/designs.module'
import { AssetsModule } from './assets/assets.module'
import { HealthModule } from './health/health.module'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { RequestIdMiddleware } from './common/middleware/request-id.middleware'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrgsModule,
    TeamsModule,
    DesignsModule,
    AssetsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*')
  }
}
