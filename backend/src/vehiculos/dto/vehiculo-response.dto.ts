import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoVehiculo } from '../enums/estado-vehiculo.enum';
import { TipoVehiculo } from '../enums/tipo-vehiculo.enum';

export class VehiculoResponseDto {
  @ApiProperty()
  id: number;

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

  @ApiProperty({ enum: EstadoVehiculo })
  estado: EstadoVehiculo;

  @ApiProperty()
  activo: boolean;

  @ApiProperty({ format: 'date-time' })
  creadoEn: string;

  @ApiProperty({ format: 'date-time' })
  actualizadoEn: string;
}
