import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { EstadoHistorialAlquiler } from '../enums/estado-historial-alquiler.enum';

@ObjectType({
  description:
    'Un alquiler pasado del cliente autenticado. Solo incluye reservas ' +
    'canceladas o ya finalizadas; las vigentes/futuras no aparecen acá ' +
    '(ver la query "reservas" para esas).',
})
export class HistorialAlquiler {
  @Field({ description: 'Marca y modelo del vehículo alquilado' })
  vehiculo: string;

  @Field({ description: 'Patente del vehículo alquilado' })
  patente: string;

  @Field({
    description:
      'Inicio del período alquilado. Scalar DateTime: siempre se ' +
      'devuelve normalizado a UTC (sufijo "Z").',
  })
  fechaInicio: Date;

  @Field({
    description: 'Fin del período alquilado. Mismo formato que fechaInicio.',
  })
  fechaFinalizacion: Date;

  @Field(() => Int, {
    description:
      'Cantidad de días del alquiler, por bloques de 24hs redondeados ' +
      'hacia arriba',
  })
  cantidadDias: number;

  @Field(() => Float, { description: 'Importe total cobrado por el alquiler' })
  importeTotal: number;

  @Field(() => EstadoHistorialAlquiler, {
    description: 'Si el alquiler terminó con normalidad o fue cancelado',
  })
  estado: EstadoHistorialAlquiler;
}
