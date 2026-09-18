import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';
import { Reserva } from './entities/reserva.entity';
import { ReservasResolver } from './reservas.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Reserva])],
  controllers: [ReservasController],
  providers: [ReservasService, ReservasResolver],
  exports: [ReservasService],
})
export class ReservasModule {}
