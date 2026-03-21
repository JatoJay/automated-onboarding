import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddDocumentDto {
  @ApiProperty({ example: 'Employee Handbook' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'This handbook covers all company policies...' })
  @IsString()
  content: string;

  @ApiProperty({ example: 'policies' })
  @IsString()
  category: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}
