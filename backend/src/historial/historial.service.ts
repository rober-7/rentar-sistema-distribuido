import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reserva } from '../reservas/entities/reserva.entity';
import { EstadoReserva } from '../reservas/enums/estado-reserva.enum';
import { calcularDias } from '../common/utils/calcular-importe';
import { HistorialAlquiler } from './dto/historial-alquiler.type';
import { EstadoHistorialAlquiler } from './enums/estado-historial-alquiler.enum';

@Injectable()
export class HistorialService {
  constructor(
    @InjectRepository(Reserva)
    private readonly reservasRepository: Repository<Reserva>,
  ) {}

  async porCliente(clienteId: number): Promise<HistorialAlquiler[]> {
    const ahora = new Date();

    const reservas = await this.reservasRepository
      .createQueryBuilder('reserva')
      .innerJoinAndSelect('reserva.cliente', 'cliente')
      .innerJoinAndSelect('reserva.vehiculo', 'vehiculo')
      .where('cliente.id = :clienteId', { clienteId })
      .andWhere(
        '(reserva.estado = :cancelada OR (reserva.estado = :confirmada AND reserva.fechaFinalizacion <= :ahora))',
        {
          cancelada: EstadoReserva.CANCELADA,
          confirmada: EstadoReserva.CONFIRMADA,
          ahora,
        },
      )
      .orderBy('reserva.fechaFinalizacion', 'DESC')
      .getMany();

    return reservas.map((reserva) => ({
      vehiculo: `${reserva.vehiculo.marca} ${reserva.vehiculo.modelo}`,
      patente: reserva.vehiculo.patente,
      fechaInicio: reserva.fechaInicio,
      fechaFinalizacion: reserva.fechaFinalizacion,
      cantidadDias: calcularDias(reserva.fechaInicio, reserva.fechaFinalizacion),
      importeTotal: reserva.importeTotal,
      estado:
        reserva.estado === EstadoReserva.CANCELADA
          ? EstadoHistorialAlquiler.CANCELADA
          : EstadoHistorialAlquiler.FINALIZADA,
    }));
  }
}
