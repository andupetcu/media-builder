import { IsArray, IsObject, IsString } from 'class-validator';

export class GenerateBulkDto {
  @IsArray()
  rows!: Record<string, any>[];

  @IsObject()
  mapping!: Record<string, string>;

  @IsString()
  designName!: string;
}
