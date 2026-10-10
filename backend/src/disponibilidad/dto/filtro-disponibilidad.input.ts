import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { TipoVehiculo } from '../../vehiculos/enums/tipo-vehiculo.enum';

@InputType({
  description:
    'Filtros para buscar vehículos disponibles en un período. Un período ' +
    'es válido cuando fechaFin es estrictamente posterior a fechaInicio ' +
    '(fechas iguales se rechazan); si no se cumple, la query devuelve un ' +
    'error "La fecha de finalización debe ser posterior a la fecha de ' +
    'inicio". Si se envían precioMinimo y precioMaximo, precioMinimo no ' +
    'puede ser mayor a precioMaximo (mismo tipo de error).',
})
export class FiltroDisponibilidadInput {
  @Field(() => TipoVehiculo, {
    nullable: true,
    description: 'Filtra por tipo de vehículo exacto. Si se omite, no filtra por tipo.',
  })
  @IsOptional()
  @IsEnum(TipoVehiculo)
  tipoVehiculo?: TipoVehiculo;

  @Field({
    nullable: true,
    description:
      'Filtra por marca (coincidencia parcial, no sensible a ' +
      'mayúsculas/minúsculas). Si se omite, no filtra por marca.',
  })
  @IsOptional()
  @IsString()
  marca?: string;

  @Field({
    nullable: true,
    description:
      'Filtra por modelo (coincidencia parcial, no sensible a ' +
      'mayúsculas/minúsculas). Si se omite, no filtra por modelo.',
  })
  @IsOptional()
  @IsString()
  modelo?: string;

  @Field(() => Float, {
    nullable: true,
    description:
      'Precio diario mínimo (inclusive). Debe ser un número positivo. Si ' +
      'se envía junto con precioMaximo, no puede ser mayor que éste.',
  })
  @IsOptional()
  @IsPositive()
  precioMinimo?: number;

  @Field(() => Float, {
    nullable: true,
    description:
      'Precio diario máximo (inclusive). Debe ser un número positivo. Si ' +
      'se envía junto con precioMinimo, no puede ser menor que éste.',
  })
  @IsOptional()
  @IsPositive()
  precioMaximo?: number;

  @Field({
    description:
      'Inicio del período a consultar. Scalar DateTime: acepta un ' +
      'string ISO-8601 con offset de zona horaria explícito (ej. ' +
      '"2026-11-01T10:00:00-03:00") o en UTC ("...Z"). Obligatorio. Debe ' +
      'ser estrictamente anterior a fechaFin.',
  })
  @IsDate()
  fechaInicio: Date;

  @Field({
    description:
      'Fin del período a consultar. Mismo formato que fechaInicio. ' +
      'Obligatorio. Debe ser estrictamente posterior a fechaInicio (un ' +
      'período de duración cero se rechaza).',
  })
  @IsDate()
  fechaFin: Date;
}
