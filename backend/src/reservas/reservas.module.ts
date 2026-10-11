import { Module } from '@nestjs/common';
import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';
import { ReservasResolver } from './reservas.resolver';
import { ClientsModule } from '@nestjs/microservices';
import { rentalGrpcClientOptions } from './rental.grpc-client';
import { clienteGrpcClientOptions } from '../clientes/clientes.grpc-client';
import { vehiculoGrpcClientOptions } from '../vehiculos/vehiculos.grpc-client';

@Module({
  imports: [
    ClientsModule.register([
      rentalGrpcClientOptions(),
      clienteGrpcClientOptions(),
      vehiculoGrpcClientOptions(),
    ]),
  ],
  controllers: [ReservasController],
  providers: [ReservasService, ReservasResolver],
  exports: [ReservasService],
})
export class ReservasModule {}
