import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class CreateReservaDto {
  @ApiProperty({ example: 12, description: 'ID del vehículo' })
  @IsInt()
  @IsPositive()
  vehiculo: number;

  @ApiProperty({ example: 5, description: 'ID del cliente' })
  @IsInt()
  @IsPositive()
  cliente: number;

  @ApiProperty({
    example: '2026-09-20T10:00:00-03:00',
    description: 'Fecha y hora de inicio de la reserva',
    format: 'date-time',
  })
  @IsDateString({ strict: true })
  @IsNotEmpty()
  fechaInicio: string;

  @ApiProperty({
    example: '2026-09-23T10:00:00-03:00',
    description: 'Fecha y hora de finalización de la reserva',
    format: 'date-time',
  })
  @IsDateString({ strict: true })
  @IsNotEmpty()
  fechaFinalizacion: string;
}
