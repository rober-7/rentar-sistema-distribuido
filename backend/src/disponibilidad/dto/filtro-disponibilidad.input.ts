import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { TipoVehiculo } from '../../vehiculos/enums/tipo-vehiculo.enum';

@InputType()
export class FiltroDisponibilidadInput {
  @Field(() => TipoVehiculo, { nullable: true })
  @IsOptional()
  @IsEnum(TipoVehiculo)
  tipoVehiculo?: TipoVehiculo;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  marca?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  modelo?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsPositive()
  precioMinimo?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsPositive()
  precioMaximo?: number;

  @Field()
  @IsDate()
  fechaInicio: Date;

  @Field()
  @IsDate()
  fechaFin: Date;
}
