import { Field, InputType, Int } from '@nestjs/graphql';
import { IsDate, IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { EstadoReserva } from '../enums/estado-reserva.enum';
import { TipoVehiculo } from '../../vehiculos/enums/tipo-vehiculo.enum';

@InputType({
  description:
    'Filtros para la query "reservas". Todos los campos son opcionales; ' +
    'omitir el input entero equivale a no filtrar. No hay validación de ' +
    'que desde sea anterior a hasta: se usan de forma independiente para ' +
    'buscar solapamiento de período (ver descripción de cada campo).',
})
export class FiltroReservasInput {
  @Field(() => Int, {
    nullable: true,
    description:
      'Filtra por id de cliente. Si quien consulta tiene rol CLIENTE, ' +
      'este valor se ignora y se usa siempre su propio id (un cliente no ' +
      'puede ver reservas ajenas). Solo tiene efecto real para ADMIN.',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  clienteId?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Filtra por id de vehículo exacto.',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  vehiculoId?: number;

  @Field(() => TipoVehiculo, {
    nullable: true,
    description: 'Filtra por tipo de vehículo exacto.',
  })
  @IsOptional()
  @IsEnum(TipoVehiculo)
  tipoVehiculo?: TipoVehiculo;

  @Field(() => EstadoReserva, {
    nullable: true,
    description: 'Filtra por estado exacto de la reserva.',
  })
  @IsOptional()
  @IsEnum(EstadoReserva)
  estado?: EstadoReserva;

  @Field({
    nullable: true,
    description:
      'Incluye reservas cuyo período termine en o después de esta fecha ' +
      '(fechaFinalizacion >= desde). Scalar DateTime, ISO-8601 con offset ' +
      'de zona horaria explícito; la respuesta siempre normaliza las ' +
      'fechas a UTC.',
  })
  @IsOptional()
  @IsDate()
  desde?: Date;

  @Field({
    nullable: true,
    description:
      'Incluye reservas cuyo período empiece en o antes de esta fecha ' +
      '(fechaInicio <= hasta). Mismo formato que desde.',
  })
  @IsOptional()
  @IsDate()
  hasta?: Date;
}
