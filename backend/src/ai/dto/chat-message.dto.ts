import { IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ example: 'How do I submit my timesheet?' })
  @IsString()
  @MinLength(1)
  message: string;

  @ApiPropertyOptional({ description: 'Department ID to prioritize content from' })
  @IsOptional()
  @IsString()
  departmentId?: string;
}
