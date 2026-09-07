import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateVehiculoDto {
  @ApiProperty({ example: 'AB123CD', description: 'Patente única del vehículo' })
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

  @ApiProperty({ example: 2022, minimum: ANIO_MINIMO, maximum: ANIO_MAXIMO })
  @IsInt()
  @Min(ANIO_MINIMO)
  @Max(ANIO_MAXIMO)
  anio: number;

  @ApiPropertyOptional({ example: 'Gris' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ enum: TipoVehiculo, example: TipoVehiculo.SEDAN })
  @IsEnum(TipoVehiculo)
  tipoVehiculo: TipoVehiculo;

  @ApiProperty({ example: 15000, description: 'Precio por día de alquiler' })
  @IsNumber()
  @IsPositive()
  precioDiario: number;
}
