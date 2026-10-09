import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { DisponibilidadResolver } from './disponibilidad.resolver';
import { DisponibilidadService } from './disponibilidad.service';
import { vehiculoGrpcClientOptions } from '../vehiculos/vehiculos.grpc-client';

@Module({
  imports: [ClientsModule.register([vehiculoGrpcClientOptions()])],
  providers: [DisponibilidadResolver, DisponibilidadService],
})
export class DisponibilidadModule {}
