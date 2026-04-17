import { IsEmail, IsNumberString, IsOptional, IsString } from 'class-validator';

export class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumberString()
  amount?: string;
}
