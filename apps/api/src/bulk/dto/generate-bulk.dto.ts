import { IsArray, IsObject, IsString, IsNotEmpty } from 'class-validator'
import { Type } from 'class-transformer'

export class GenerateBulkDto {
  @IsArray()
  @IsNotEmpty()
  @Type(() => Object)
  rows!: Record<string, any>[]

  @IsObject()
  @IsNotEmpty()
  mapping!: Record<string, string>

  @IsString()
  @IsNotEmpty()
  designName!: string
}
