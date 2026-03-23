import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FormFieldType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  CHECKBOX = 'CHECKBOX',
  FILE = 'FILE',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
}

export class CreateFormFieldDto {
  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty({ enum: FormFieldType })
  @IsEnum(FormFieldType)
  type: FormFieldType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  helpText?: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({ description: 'Options for SELECT/MULTI_SELECT fields' })
  @IsOptional()
  @IsArray()
  options?: string[];

  @ApiPropertyOptional({ description: 'Validation rules' })
  @IsOptional()
  validation?: Record<string, any>;

  @ApiProperty({ default: 0 })
  @IsInt()
  @Min(0)
  order: number;
}

export class CreateFormDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  isOrgWide: boolean;

  @ApiPropertyOptional({ description: 'Department ID if not org-wide' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ type: [CreateFormFieldDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFormFieldDto)
  fields?: CreateFormFieldDto[];
}
