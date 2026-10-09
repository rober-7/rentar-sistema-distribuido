import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '@nestjs/microservices';
import { VehiculosController } from './vehiculos.controller';
import { Vehiculo } from './entities/vehiculo.entity';
import { vehiculoGrpcClientOptions } from './vehiculos.grpc-client';

@Module({
  imports: [
    // Ningún provider de este módulo inyecta este repositorio: el Gateway ya
    // no toca la tabla "vehiculos" directamente, todo el ABM y las consultas
    // pasan por gRPC al Vehicle Service. Esta registración queda solo porque
    // Reserva (otro dominio, todavía sin migrar) tiene una relación
    // @ManyToOne hacia Vehiculo, y TypeORM necesita la entidad registrada en
    // algún forFeature() para resolver esa relación y hacer synchronize.
    TypeOrmModule.forFeature([Vehiculo]),
    ClientsModule.register([vehiculoGrpcClientOptions()]),
  ],
  controllers: [VehiculosController],
})
export class VehiculosModule {}
