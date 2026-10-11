import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { VehiculosController } from './vehiculos.controller';
import { vehiculoGrpcClientOptions } from './vehiculos.grpc-client';
import { rentalGrpcClientOptions } from '../reservas/rental.grpc-client';

@Module({
  imports: [
    ClientsModule.register([
      vehiculoGrpcClientOptions(),
      rentalGrpcClientOptions(),
    ]),
  ],
  controllers: [VehiculosController],
})
export class VehiculosModule {}
