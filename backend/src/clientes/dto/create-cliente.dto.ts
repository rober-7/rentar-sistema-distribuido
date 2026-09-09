import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateClienteDto {
  @ApiProperty({
    example: '12345678',
    description: 'Documento único del cliente',
  })
  @IsString()
  @IsNotEmpty()
  documento: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  apellido: string;

  @ApiProperty({ example: 'juan.perez@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '1112345678' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ example: '1990-05-15', description: 'Fecha de nacimiento' })
  @IsDateString()
  @IsNotEmpty()
  fechaNacimiento: string;
}
