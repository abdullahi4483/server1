import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @IsString()
  platformName?: string;

  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  @IsOptional()
  @IsNumberString()
  withdrawalManualThreshold?: string;

  @IsOptional()
  @IsBoolean()
  autoApproveEnabled?: boolean;

  @IsOptional()
  @IsNumberString()
  autoApproveMaxAmount?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sessionTimeoutMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  apiRateLimitPerHour?: number;
}
