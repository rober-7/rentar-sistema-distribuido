import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { EstadoHistorialAlquiler } from '../enums/estado-historial-alquiler.enum';

@ObjectType()
export class HistorialAlquiler {
  @Field()
  vehiculo: string;

  @Field()
  patente: string;

  @Field()
  fechaInicio: Date;

  @Field()
  fechaFinalizacion: Date;

  @Field(() => Int)
  cantidadDias: number;

  @Field(() => Float)
  importeTotal: number;

  @Field(() => EstadoHistorialAlquiler)
  estado: EstadoHistorialAlquiler;
}
