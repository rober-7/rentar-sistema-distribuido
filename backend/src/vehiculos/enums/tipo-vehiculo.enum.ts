import { registerEnumType } from '@nestjs/graphql';

export enum TipoVehiculo {
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  PICKUP = 'PICKUP',
  COUPE = 'COUPE',
  HATCHBACK = 'HATCHBACK',
}

registerEnumType(TipoVehiculo, { name: 'TipoVehiculo' });
