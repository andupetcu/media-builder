import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { formatErrorResponse } from '@media-builder/shared'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getResponse<Request>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let errorResponse: any = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      if (typeof exceptionResponse === 'object') {
        errorResponse = {
          ...errorResponse,
          ...exceptionResponse,
        }
      } else {
        errorResponse.message = exceptionResponse
      }
    } else if (exception instanceof Error) {
      errorResponse.message = exception.message
    }

    // Get request ID from request context
    const requestId = (request as any).id || 'unknown'

    response.status(status).json(
      formatErrorResponse(
        {
          code: errorResponse.code || errorResponse.error || 'INTERNAL_ERROR',
          message: errorResponse.message,
          details: errorResponse.details,
        },
        requestId
      )
    )
  }
}
