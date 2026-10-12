import { registerEnumType } from '@nestjs/graphql';

export enum EstadoReserva {
  CONFIRMADA = 'CONFIRMADA',
  CANCELADA = 'CANCELADA',
}

registerEnumType(EstadoReserva, {
  name: 'EstadoReserva',
  description: 'Estado de una reserva.',
  valuesMap: {
    CONFIRMADA: {
      description:
        'Reserva activa y vigente; bloquea el vehículo para ese período.',
    },
    CANCELADA: {
      description:
        'Reserva cancelada por el cliente antes de que comenzara el ' +
        'alquiler; no bloquea el vehículo.',
    },
  },
});
