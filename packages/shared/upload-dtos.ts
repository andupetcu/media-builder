import { IsString, IsEnum, IsOptional, IsArray, MaxLength } from 'class-validator'
import { AssetKind } from './types'

export class StartUploadDto {
  @IsString()
  @MaxLength(255)
  filename!: string

  @IsString()
  mimeType!: string

  @IsString()
  sizeBytes!: string // Use string to handle large numbers

  @IsEnum(AssetKind)
  kind!: AssetKind

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]
}

export class FinishUploadDto {
  @IsString()
  uploadId!: string

  @IsString()
  hash!: string
}

export class UploadResponseDto {
  uploadId!: string
  uploadUrl!: string
}

export class AssetResponseDto {
  id!: string
  teamId!: string
  kind!: AssetKind
  name!: string
  slug!: string
  mimeType!: string
  sizeBytes!: string
  hash!: string
  publicUrl?: string | null
  thumbnailUrl?: string | null
  proxyUrl?: string | null
  meta!: any
  tags!: string[]
  createdAt!: Date
  updatedAt!: Date
  uploadedBy!: {
    id: string
    name: string
    email: string
  }
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]
}
