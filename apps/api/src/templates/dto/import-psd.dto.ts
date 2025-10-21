import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator'
import { Transform } from 'class-transformer'

export class ImportPsdDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsArray()
  @IsOptional()
  @Transform(({ value }) => {
    // Handle both JSON string and array
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return [value]
      }
    }
    return Array.isArray(value) ? value : [value]
  })
  tags?: string[]

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    // Handle string boolean values from form data
    if (typeof value === 'string') {
      return value === 'true'
    }
    return Boolean(value)
  })
  isPublic?: boolean
}
