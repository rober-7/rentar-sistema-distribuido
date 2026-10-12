import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { TipoVehiculo } from '../../vehiculos/enums/tipo-vehiculo.enum';

@ObjectType({
  description:
    'Un vehículo que está libre durante todo el período consultado en ' +
    'vehiculosDisponibles (sin reservas CONFIRMADAS que se superpongan).',
})
export class VehiculoDisponible {
  @Field(() => Int, { description: 'Identificador único del vehículo' })
  id: number;

  @Field({ description: 'Patente del vehículo' })
  patente: string;

  @Field({ description: 'Marca del vehículo (ej. Toyota)' })
  marca: string;

  @Field({ description: 'Modelo del vehículo (ej. Corolla)' })
  modelo: string;

  @Field(() => Int, { description: 'Año de fabricación' })
  anio: number;

  @Field({ nullable: true, description: 'Color del vehículo, si está cargado' })
  color: string | null;

  @Field(() => TipoVehiculo, { description: 'Categoría del vehículo' })
  tipoVehiculo: TipoVehiculo;

  @Field(() => Float, {
    description: 'Precio de alquiler por día, en la moneda del sistema',
  })
  precioDiario: number;

  @Field(() => Float, {
    description:
      'Importe para el período consultado, por bloques de 24 horas redondeados hacia arriba. Se recalcula al crear la reserva con el precio vigente.',
  })
  importeTotal: number;
}
