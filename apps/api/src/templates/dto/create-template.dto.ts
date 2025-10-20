import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, IsArray } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNotEmpty()
  doc!: any; // Polotno JSON

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsInt()
  @IsNotEmpty()
  width!: number;

  @IsInt()
  @IsNotEmpty()
  height!: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
