import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '@nestjs/microservices';
import { ClientesController } from './clientes.controller';
import { Usuario } from './entities/usuario.entity';
import { clienteGrpcClientOptions } from './clientes.grpc-client';

@Module({
  imports: [
    // Mantenemos la entidad para que TypeORM la reconozca en las relaciones
    // y permita sincronizar la base de datos, aunque el Gateway ya no la 
    // consulte directamente para el ABM.
    TypeOrmModule.forFeature([Usuario]),
    // Registramos el cliente gRPC para comunicarnos con Python
    ClientsModule.register([clienteGrpcClientOptions()]),
  ],
  controllers: [ClientesController],
})
export class ClientesModule {}