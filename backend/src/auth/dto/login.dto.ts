import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@rentar.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'AdminRentar2026!' })
  @IsString()
  password: string;
}