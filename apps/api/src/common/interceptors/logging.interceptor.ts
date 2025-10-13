import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP')

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const { method, url } = request
    const requestId = request.id || 'unknown'
    const now = Date.now()

    this.logger.log(`[${requestId}] ${method} ${url} - Start`)

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - now
          this.logger.log(`[${requestId}] ${method} ${url} - ${duration}ms`)
        },
        error: error => {
          const duration = Date.now() - now
          this.logger.error(
            `[${requestId}] ${method} ${url} - ${duration}ms - Error: ${error.message}`
          )
        },
      })
    )
  }
}
