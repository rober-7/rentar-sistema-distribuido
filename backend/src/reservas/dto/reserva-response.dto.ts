import { ApiProperty } from '@nestjs/swagger';
import { EstadoReserva } from '../enums/estado-reserva.enum';

class IdReferenceDto {
  @ApiProperty()
  id: number;
}

export class ReservaCreadaResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ type: IdReferenceDto })
  vehiculo: IdReferenceDto;

  @ApiProperty({ type: IdReferenceDto })
  cliente: IdReferenceDto;

  @ApiProperty({ format: 'date-time' })
  fechaInicio: Date;

  @ApiProperty({ format: 'date-time' })
  fechaFinalizacion: Date;

  @ApiProperty()
  importeTotal: number;

  @ApiProperty({ enum: EstadoReserva })
  estado: EstadoReserva;

  @ApiProperty()
  activo: boolean;
}

export class ReservaResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  vehiculoId: number;

  @ApiProperty()
  clienteId: number;

  @ApiProperty({ format: 'date-time' })
  fechaInicio: string;

  @ApiProperty({ format: 'date-time' })
  fechaFinalizacion: string;

  @ApiProperty()
  importeTotal: number;

  @ApiProperty({ enum: EstadoReserva })
  estado: EstadoReserva;

  @ApiProperty()
  activo: boolean;
}
