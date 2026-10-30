import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoVehiculo } from '../enums/tipo-vehiculo.enum';

export enum EstadoVehiculoExterno {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
}

// Resultado de cada validación asíncrona (patente y titularidad).
export enum ResultadoValidacionExterno {
  PENDIENTE = 'PENDIENTE',
  VALIDADO = 'VALIDADO',
  RECHAZADO = 'RECHAZADO',
}

export class VehiculoExternoResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  clienteId: number;

  @ApiProperty()
  patente: string;

  @ApiProperty()
  marca: string;

  @ApiProperty()
  modelo: string;

  @ApiProperty()
  anio: number;

  @ApiPropertyOptional({ nullable: true })
  color?: string;

  @ApiProperty({ enum: TipoVehiculo })
  tipoVehiculo: TipoVehiculo;

  @ApiProperty()
  precioDiario: number;

  @ApiProperty({
    enum: EstadoVehiculoExterno,
    example: EstadoVehiculoExterno.PENDIENTE,
  })
  estado: EstadoVehiculoExterno;

  @ApiProperty({
    enum: ResultadoValidacionExterno,
    description: 'Validación de patente contra el registro de robos',
  })
  validacionPatente: ResultadoValidacionExterno;

  @ApiProperty({
    enum: ResultadoValidacionExterno,
    description: 'Validación de titularidad contra el registro automotor',
  })
  validacionTitularidad: ResultadoValidacionExterno;

  @ApiProperty({ format: 'date-time' })
  creadoEn: string;

  @ApiProperty({ format: 'date-time' })
  actualizadoEn: string;
}

