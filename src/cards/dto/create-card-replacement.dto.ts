import { IsOptional, IsString } from 'class-validator';

export class CreateCardReplacementDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
