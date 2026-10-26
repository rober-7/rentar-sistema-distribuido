import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { TipoVehiculo } from '../enums/tipo-vehiculo.enum';

const ANIO_MINIMO = 1900;
const ANIO_MAXIMO = new Date().getFullYear() + 1;

export class CreateVehiculoExternoDto {
  @ApiProperty({
    example: 'AD123EX',
    description: 'Patente del vehículo externo ofrecido por el cliente',
  })
  @IsString()
  @IsNotEmpty()
  patente: string;

  @ApiProperty({ example: 'Toyota' })
  @IsString()
  @IsNotEmpty()
  marca: string;

  @ApiProperty({ example: 'Corolla' })
  @IsString()
  @IsNotEmpty()
  modelo: string;

  @ApiProperty({ example: 2023, minimum: ANIO_MINIMO, maximum: ANIO_MAXIMO })
  @Type(() => Number)
  @IsInt()
  @Min(ANIO_MINIMO)
  @Max(ANIO_MAXIMO)
  anio: number;

  @ApiPropertyOptional({ example: 'Blanco' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ enum: TipoVehiculo, example: TipoVehiculo.SEDAN })
  @IsEnum(TipoVehiculo)
  tipoVehiculo: TipoVehiculo;

  @ApiProperty({ example: 28000, description: 'Precio por día de alquiler' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  precioDiario: number;
}

