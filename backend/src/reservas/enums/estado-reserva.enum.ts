import { registerEnumType } from '@nestjs/graphql';

export enum EstadoReserva {
  CONFIRMADA = 'CONFIRMADA',
  CANCELADA = 'CANCELADA',
}

registerEnumType(EstadoReserva, { name: 'EstadoReserva' });
