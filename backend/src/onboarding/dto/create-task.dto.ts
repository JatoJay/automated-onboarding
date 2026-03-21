import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty({ example: 'Complete tax forms' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['DOCUMENT', 'FORM', 'TRAINING', 'MEETING', 'APPROVAL'] })
  @IsEnum(['DOCUMENT', 'FORM', 'TRAINING', 'MEETING', 'APPROVAL'])
  type: string;

  @ApiPropertyOptional({ example: '2024-01-20' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedById?: string;
}
