import { IsString, IsEnum, IsOptional, IsInt, IsBoolean, Min, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskTemplateDto {
  @ApiProperty({ example: 'Complete W-4 tax form' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['DOCUMENT', 'FORM', 'TRAINING', 'MEETING', 'APPROVAL'] })
  @IsEnum(['DOCUMENT', 'FORM', 'TRAINING', 'MEETING', 'APPROVAL'])
  type: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  daysFromStart?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ description: 'ID of attached form' })
  @IsOptional()
  @IsString()
  attachedFormId?: string;

  @ApiPropertyOptional({ description: 'ID of attached knowledge document' })
  @IsOptional()
  @IsString()
  attachedDocId?: string;

  @ApiPropertyOptional({ description: 'Attached URL' })
  @IsOptional()
  @IsString()
  attachedUrl?: string;
}
