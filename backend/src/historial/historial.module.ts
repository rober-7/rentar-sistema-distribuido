import { Module } from '@nestjs/common';
import { HistorialService } from './historial.service';
import { HistorialResolver } from './historial.resolver';
import { ClientsModule } from '@nestjs/microservices';
import { rentalGrpcClientOptions } from '../reservas/rental.grpc-client';
import { vehiculoGrpcClientOptions } from '../vehiculos/vehiculos.grpc-client';

@Module({
  imports: [
    ClientsModule.register([
      rentalGrpcClientOptions(),
      vehiculoGrpcClientOptions(),
    ]),
  ],
  providers: [HistorialService, HistorialResolver],
})
export class HistorialModule {}
