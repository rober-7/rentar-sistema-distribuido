import { Field, InputType, Int } from '@nestjs/graphql';
import { IsDate, IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { EstadoReserva } from '../enums/estado-reserva.enum';
import { TipoVehiculo } from '../../vehiculos/enums/tipo-vehiculo.enum';

@InputType()
export class FiltroReservasInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  clienteId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  vehiculoId?: number;

  @Field(() => TipoVehiculo, { nullable: true })
  @IsOptional()
  @IsEnum(TipoVehiculo)
  tipoVehiculo?: TipoVehiculo;

  @Field(() => EstadoReserva, { nullable: true })
  @IsOptional()
  @IsEnum(EstadoReserva)
  estado?: EstadoReserva;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  desde?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  hasta?: Date;
}
