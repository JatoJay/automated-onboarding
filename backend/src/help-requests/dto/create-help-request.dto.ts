import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHelpRequestDto {
  @ApiProperty({ enum: ['TASK_BLOCKED', 'QUESTION', 'TECHNICAL_ISSUE', 'ACCESS_REQUEST', 'OTHER'] })
  @IsEnum(['TASK_BLOCKED', 'QUESTION', 'TECHNICAL_ISSUE', 'ACCESS_REQUEST', 'OTHER'])
  category: string;

  @ApiProperty({ example: 'Cannot access training portal' })
  @IsString()
  subject: string;

  @ApiProperty({ example: 'I am getting an error when trying to access the training portal...' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Task ID if requesting help for a specific task' })
  @IsOptional()
  @IsString()
  taskId?: string;
}

export class UpdateHelpRequestDto {
  @ApiPropertyOptional({ enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] })
  @IsOptional()
  @IsEnum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolution?: string;
}

export class CreateReplyDto {
  @ApiProperty({ example: 'Let me help you with that...' })
  @IsString()
  message: string;
}
