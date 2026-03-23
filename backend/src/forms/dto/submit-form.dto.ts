import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitFormDto {
  @ApiProperty({ description: 'Form field values as key-value pairs' })
  @IsObject()
  data: Record<string, any>;
}
