import { IsString, MinLength } from 'class-validator';

export class ReplyMessageDto {
  @IsString()
  @MinLength(2)
  body!: string;
}
