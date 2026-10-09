import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '@nestjs/microservices';
import { VehiculosController } from './vehiculos.controller';
import { VehiculosService } from './vehiculos.service';
import { Vehiculo } from './entities/vehiculo.entity';
import { Reserva } from '../reservas/entities/reserva.entity';
import { vehiculoGrpcClientOptions } from './vehiculos.grpc-client';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehiculo, Reserva]),
    ClientsModule.register([vehiculoGrpcClientOptions()]),
  ],
  controllers: [VehiculosController],
  providers: [VehiculosService],
  exports: [VehiculosService],
})
export class VehiculosModule {}
