import { randomUUID } from 'crypto'

export function generateRequestId(): string {
  return randomUUID()
}

export function formatErrorResponse(error: any, requestId: string) {
  return {
    code: error.code || 'INTERNAL_ERROR',
    message: error.message || 'An unexpected error occurred',
    details: error.details,
    requestId,
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
