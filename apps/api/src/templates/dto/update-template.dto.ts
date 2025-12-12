import { IsString, IsOptional, IsInt, IsBoolean, IsArray } from 'class-validator'

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsOptional()
  doc?: any // Polotno JSON

  @IsString()
  @IsOptional()
  thumbnail?: string

  @IsInt()
  @IsOptional()
  width?: number

  @IsInt()
  @IsOptional()
  height?: number

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[]

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean
}
