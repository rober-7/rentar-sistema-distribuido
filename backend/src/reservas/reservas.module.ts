import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';
import { Reserva } from './entities/reserva.entity';
import { ReservasResolver } from './reservas.resolver';
import { ClientsModule } from '@nestjs/microservices';
import { rentalGrpcClientOptions } from './rental.grpc-client';
import { clienteGrpcClientOptions } from '../clientes/clientes.grpc-client';
import { vehiculoGrpcClientOptions } from '../vehiculos/vehiculos.grpc-client';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reserva]),
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
