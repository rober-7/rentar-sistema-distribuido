import { Field, Int, ObjectType } from '@nestjs/graphql';


// Contrato de salida

@ObjectType({
  description: 'Resultado de registrar la devolución de un vehículo.',
})
export class DevolucionResponse {
  @Field(() => Int, {
    description: 'Identificador de la reserva devuelta.',
  })
  reservaId: number;

  @Field(() => Int, {
    description: 'Kilometraje registrado al finalizar el alquiler.',
  })
  kilometrajeFinal: number;

  @Field({
    description: 'Estado físico general reportado del vehículo.',
  })
  estadoGeneral: string;

  @Field({
    description: 'Mensaje de confirmación de la operación.',
  })
  mensaje: string;

  @Field({
    description: 'Fecha y hora en que se registró la devolución.',
  })
  fechaDevolucion: Date;

  @Field({
    description: 'Nuevo estado resultante de la reserva.',
  })
  estado: string;
}
