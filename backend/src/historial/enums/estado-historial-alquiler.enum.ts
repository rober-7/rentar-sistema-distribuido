import { registerEnumType } from '@nestjs/graphql';

export enum EstadoHistorialAlquiler {
  FINALIZADA = 'FINALIZADA',
  CANCELADA = 'CANCELADA',
}

registerEnumType(EstadoHistorialAlquiler, {
  name: 'EstadoHistorialAlquiler',
  description:
    'Estado de un alquiler dentro del historial (solo incluye reservas ' +
    'pasadas o canceladas, nunca las vigentes/futuras).',
  valuesMap: {
    FINALIZADA: {
      description:
        'La reserva estuvo CONFIRMADA y su período ya terminó ' +
        '(fechaFinalizacion <= ahora).',
    },
    CANCELADA: {
      description: 'La reserva fue cancelada por el cliente.',
    },
  },
});
