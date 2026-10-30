import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { VehiculosController } from './vehiculos.controller';
import { VehiculosExternosController } from './vehiculos-externos.controller';
import { vehiculoGrpcClientOptions } from './vehiculos.grpc-client';
import { rentalGrpcClientOptions } from '../reservas/rental.grpc-client';

@Module({
  imports: [
    ClientsModule.register([
      vehiculoGrpcClientOptions(),
      rentalGrpcClientOptions(),
    ]),
  ],
  // El orden importa: GET /vehiculos/externos tiene que registrarse antes que
  // GET /vehiculos/:id, o "externos" se interpretaría como un id.
  controllers: [VehiculosExternosController, VehiculosController],
})
export class VehiculosModule {}
