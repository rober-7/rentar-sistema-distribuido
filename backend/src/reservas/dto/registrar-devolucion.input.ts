import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

// Contrato de entrada o input

export const ESTADOS_GENERALES_VEHICULO = [
  'EXCELENTE',
  'BUENO',
  'DANIO_LEVE',
  'DANIO_GRAVE',
] as const; // Valores posibles para el estado general del vehículo al devolverse.

@InputType({
  description: 'Datos necesarios para registrar la devolución de un vehículo.',
})
export class RegistrarDevolucionInput {
  @Field(() => Int, {
    description: 'Identificador de la reserva o alquiler que se devuelve.',
  })
  @IsInt() // Tiene que ser un número entero
  @Min(1) // El valor mínimo permitido es 1
  reservaId: number;

  @Field(() => Int, {
    description: 'Kilometraje actual del vehículo al momento de la entrega.',
  })
  @IsInt() // Tiene que ser un número entero
  @Min(0) // El valor mínimo permitido es 0
  kilometrajeFinal: number;

  @Field({
    description:
      'Estado general del vehículo al devolverse (EXCELENTE, BUENO, DANIO_LEVE, DANIO_GRAVE).',
  })
  @IsString() // Tiene que ser texto
  @IsNotEmpty() // Tiene que estar vacio
  @IsIn(ESTADOS_GENERALES_VEHICULO) // Valida que cumpla con los valores permitidos
  estadoGeneral: string;
}
