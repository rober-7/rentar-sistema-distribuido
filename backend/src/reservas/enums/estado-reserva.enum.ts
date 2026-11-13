import { registerEnumType } from '@nestjs/graphql';

export enum EstadoReserva {
  CONFIRMADA = 'CONFIRMADA',
  CANCELADA = 'CANCELADA',
  FINALIZADA = 'FINALIZADA',
  FINALIZADO = 'FINALIZADO',
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
    FINALIZADA: {
      description: 'Reserva finalizada tras la devolución del vehículo.',
    },
    FINALIZADO: {
      description:
        'Alquiler finalizado tras registrar la devolución del vehículo; libera el vehículo.',
    },
  },
});
