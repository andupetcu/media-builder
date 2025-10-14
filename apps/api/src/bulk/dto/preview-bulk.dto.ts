import { IsArray, IsObject, IsOptional, IsNumber } from 'class-validator';

export class PreviewBulkDto {
  @IsArray()
  rows!: Record<string, any>[];

  @IsObject()
  mapping!: Record<string, string>;

  @IsOptional()
  @IsNumber()
  previewCount?: number;
}
