import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { EstadoReserva } from '../enums/estado-reserva.enum';

@ObjectType()
export class ReservaConsulta {
  @Field(() => Int)
  id: number;

  @Field()
  cliente: string;

  @Field(() => Int)
  clienteId: number;

  @Field()
  vehiculo: string;

  @Field(() => Int)
  vehiculoId: number;

  @Field()
  patente: string;

  @Field()
  fechaInicio: Date;

  @Field()
  fechaFinalizacion: Date;

  @Field(() => Float)
  precioDiario: number;

  @Field(() => Float)
  importeTotal: number;

  @Field(() => EstadoReserva)
  estado: EstadoReserva;
}
