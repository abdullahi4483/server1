import { IsNumberString, IsString } from 'class-validator';

export class CreateWithdrawalDto {
  @IsString()
  accountId!: string;

  @IsNumberString()
  amount!: string;

  @IsString()
  currency!: string;
}
