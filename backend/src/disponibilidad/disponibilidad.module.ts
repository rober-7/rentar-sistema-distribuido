import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { DisponibilidadResolver } from './disponibilidad.resolver';
import { DisponibilidadService } from './disponibilidad.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vehiculo])],
  providers: [DisponibilidadResolver, DisponibilidadService],
})
export class DisponibilidadModule {}
