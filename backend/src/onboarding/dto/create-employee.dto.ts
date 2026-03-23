import { IsString, IsDateString, IsOptional, IsEmail, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiPropertyOptional({ description: 'User ID for active employees with login access' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'First name for directory-only employees' })
  @ValidateIf((o) => !o.userId)
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name for directory-only employees' })
  @ValidateIf((o) => !o.userId)
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Email for directory-only employees' })
  @ValidateIf((o) => !o.userId)
  @IsEmail()
  email?: string;

  @ApiProperty()
  @IsString()
  departmentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiProperty({ example: 'Software Engineer' })
  @IsString()
  jobTitle: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  startDate: string;
}
