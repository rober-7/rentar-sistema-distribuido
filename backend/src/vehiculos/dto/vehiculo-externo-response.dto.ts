import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoVehiculo } from '../enums/tipo-vehiculo.enum';

export enum EstadoVehiculoExterno {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
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

  @ApiProperty({ format: 'date-time' })
  creadoEn: string;

  @ApiProperty({ format: 'date-time' })
  actualizadoEn: string;
}

