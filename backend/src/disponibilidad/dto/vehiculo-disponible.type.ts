import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { TipoVehiculo } from '../../vehiculos/enums/tipo-vehiculo.enum';

@ObjectType()
export class VehiculoDisponible {
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
}
