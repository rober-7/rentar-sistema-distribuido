import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { ClientesController } from './clientes.controller';
import { clienteGrpcClientOptions } from './clientes.grpc-client';

@Module({
  imports: [ClientsModule.register([clienteGrpcClientOptions()])],
  controllers: [ClientesController],
})
export class ClientesModule {}
