import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { EstadoReserva } from '../enums/estado-reserva.enum';

@ObjectType({
  description: 'Una reserva, tal como la devuelve la query "reservas".',
})
export class ReservaConsulta {
  @Field(() => Int, { description: 'Identificador único de la reserva' })
  id: number;

  @Field({ description: 'Nombre y apellido del cliente que reservó' })
  cliente: string;

  @Field(() => Int, { description: 'Id del cliente que reservó' })
  clienteId: number;

  @Field({ description: 'Marca y modelo del vehículo reservado' })
  vehiculo: string;

  @Field(() => Int, { description: 'Id del vehículo reservado' })
  vehiculoId: number;

  @Field({ description: 'Patente del vehículo reservado' })
  patente: string;

  @Field({
    description:
      'Inicio del período reservado. Scalar DateTime: siempre se ' +
      'devuelve normalizado a UTC (sufijo "Z"), aunque se haya creado la ' +
      'reserva con otro offset de zona horaria.',
  })
  fechaInicio: Date;

  @Field({
    description: 'Fin del período reservado. Mismo formato que fechaInicio.',
  })
  fechaFinalizacion: Date;

  @Field(() => Float, {
    description: 'Precio diario del vehículo vigente al momento de reservar',
  })
  precioDiario: number;

  @Field(() => Float, {
    description:
      'Importe total de la reserva, calculado al momento de crearla ' +
      '(precioDiario × días, por bloques de 24hs redondeados hacia arriba)',
  })
  importeTotal: number;

  @Field(() => EstadoReserva, { description: 'Estado actual de la reserva' })
  estado: EstadoReserva;
}
