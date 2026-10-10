import { registerEnumType } from '@nestjs/graphql';

export enum TipoVehiculo {
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  PICKUP = 'PICKUP',
  COUPE = 'COUPE',
  HATCHBACK = 'HATCHBACK',
}

registerEnumType(TipoVehiculo, {
  name: 'TipoVehiculo',
  description: 'Categoría de carrocería de un vehículo.',
  valuesMap: {
    SEDAN: { description: 'Sedán, 4 puertas, baúl separado' },
    SUV: { description: 'Utilitario deportivo' },
    PICKUP: { description: 'Camioneta con caja de carga' },
    COUPE: { description: 'Coupé, 2 puertas' },
    HATCHBACK: { description: 'Hatchback, baúl integrado a la cabina' },
  },
});
