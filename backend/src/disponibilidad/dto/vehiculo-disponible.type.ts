import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { TipoVehiculo } from '../../vehiculos/enums/tipo-vehiculo.enum';

@ObjectType()
export class VehiculoDisponible {
  @Field(() => Int)
  id: number;

  @Field()
  patente: string;

  @Field()
  marca: string;

  @Field()
  modelo: string;

  @Field(() => Int)
  anio: number;

  @Field({ nullable: true })
  color: string | null;

  @Field(() => TipoVehiculo)
  tipoVehiculo: TipoVehiculo;

  @Field(() => Float)
  precioDiario: number;

  @Field(() => Float, {
    description:
      'Importe para el período consultado, por bloques de 24 horas redondeados hacia arriba. Se recalcula al crear la reserva con el precio vigente.',
  })
  importeTotal: number;
}
