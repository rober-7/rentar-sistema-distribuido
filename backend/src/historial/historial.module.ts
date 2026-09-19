import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reserva } from '../reservas/entities/reserva.entity';
import { HistorialService } from './historial.service';
import { HistorialResolver } from './historial.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Reserva])],
  providers: [HistorialService, HistorialResolver],
})
export class HistorialModule {}
