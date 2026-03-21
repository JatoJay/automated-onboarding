import { IsString, IsOptional, IsUrl, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UploadDocumentDto {
  @ApiProperty({ example: 'policies' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ example: 'Employee Handbook 2024' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Department ID to scope this document' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Whether this document is accessible org-wide', default: false })
  @IsOptional()
  @IsBoolean()
  isOrgWide?: boolean;
}

export class UploadFromUrlDto {
  @ApiProperty({ example: 'https://company.com/policies/handbook.pdf' })
  @IsUrl()
  url: string;

  @ApiProperty({ example: 'policies' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ example: 'Employee Handbook' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Department ID to scope this document' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Whether this document is accessible org-wide', default: false })
  @IsOptional()
  @IsBoolean()
  isOrgWide?: boolean;
}

export class BulkDocumentDto {
  @ApiProperty({ example: 'PTO Policy' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'All employees are entitled to 20 days of PTO...' })
  @IsString()
  content: string;

  @ApiProperty({ example: 'policies' })
  @IsString()
  category: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Department ID to scope this document' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Whether this document is accessible org-wide', default: false })
  @IsOptional()
  @IsBoolean()
  isOrgWide?: boolean;
}

export class BulkUploadDto {
  @ApiProperty({ type: [BulkDocumentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkDocumentDto)
  documents: BulkDocumentDto[];
}
