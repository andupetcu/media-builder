import { IsString, IsNumber, IsOptional } from 'class-validator'

export class StartChunkedUploadDto {
  @IsString()
  filename!: string

  @IsNumber()
  totalSize!: number

  @IsNumber()
  totalChunks!: number

  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  tags?: string

  @IsString()
  @IsOptional()
  isPublic?: string
}

export class UploadChunkDto {
  @IsString()
  uploadId!: string

  @IsNumber()
  chunkIndex!: number

  @IsNumber()
  totalChunks!: number
}

export class FinishChunkedUploadDto {
  @IsString()
  uploadId!: string

  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  tags?: string

  @IsString()
  @IsOptional()
  isPublic?: string
}
