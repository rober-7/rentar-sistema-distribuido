import { registerEnumType } from '@nestjs/graphql';

export enum EstadoHistorialAlquiler {
  FINALIZADA = 'FINALIZADA',
  CANCELADA = 'CANCELADA',
}

registerEnumType(EstadoHistorialAlquiler, { name: 'EstadoHistorialAlquiler' });
