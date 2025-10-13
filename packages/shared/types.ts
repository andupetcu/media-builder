export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  DESIGNER = 'DESIGNER',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export enum AssetKind {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  FONT = 'FONT',
  TEMPLATE = 'TEMPLATE',
}

export enum DesignStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  ARCHIVED = 'ARCHIVED',
}

export enum BulkJobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface JwtPayload {
  sub: string // userId
  email: string
  iat?: number
  exp?: number
}

export interface RequestUser {
  id: string
  email: string
}
