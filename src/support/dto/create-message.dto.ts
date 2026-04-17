import { IsString, MinLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  category!: string;

  @IsString()
  @MinLength(3)
  subject!: string;

  @IsString()
  @MinLength(3)
  message!: string;
}
