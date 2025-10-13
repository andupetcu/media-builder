import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { generateRequestId } from '@media-builder/shared'

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = req.headers['x-request-id'] as string || generateRequestId()
    ;(req as any).id = requestId
    res.setHeader('X-Request-Id', requestId)
    next()
  }
}
