import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { Reserva } from './entities/reserva.entity';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { EstadoVehiculo } from '../vehiculos/enums/estado-vehiculo.enum';
import { calcularImporte } from '../common/utils/calcular-importe';
import { EstadoReserva } from './enums/estado-reserva.enum';

@Injectable()
export class ReservasService {
  constructor(
    @InjectRepository(Reserva)
    private readonly reservasRepository: Repository<Reserva>,
  ) {}

  async create(dto: CreateReservaDto): Promise<Reserva> {
    const fechaInicio = new Date(dto.fechaInicio);
    const fechaFinalizacion = new Date(dto.fechaFinalizacion);

    if (
      !Number.isFinite(fechaInicio.getTime()) ||
      !Number.isFinite(fechaFinalizacion.getTime())
    ) {
      throw new BadRequestException('Las fechas deben ser válidas');
    }
    if (fechaInicio.getTime() <= Date.now()) {
      throw new BadRequestException('La fecha de inicio debe ser futura');
    }
    if (fechaFinalizacion <= fechaInicio) {
      throw new BadRequestException(
        'La fecha de finalización debe ser posterior a la fecha de inicio',
      );
    }

    return this.reservasRepository.manager.transaction(async (manager) => {
      // Serializa las altas del mismo vehículo, incluso entre instancias del backend.
      const vehiculo = await manager.findOne(Vehiculo, {
        where: { id: dto.vehiculo },
        lock: { mode: 'pessimistic_write' },
      });
      if (!vehiculo) {
        throw new NotFoundException(
          `No existe un vehículo con id ${dto.vehiculo}`,
        );
      }
      if (!vehiculo.activo) {
        throw new ConflictException('El vehículo está inactivo');
      }

      const cliente = await manager.findOne(Cliente, {
        where: { id: dto.cliente },
        lock: { mode: 'pessimistic_read' },
      });
      if (!cliente) {
        throw new NotFoundException(
          `No existe un cliente con id ${dto.cliente}`,
        );
      }
      if (!cliente.activo) {
        throw new ConflictException('El cliente está inactivo');
      }

      // Intervalos [inicio, fin): una reserva puede comenzar cuando termina otra.
      const solapada = await manager.exists(Reserva, {
        where: {
          vehiculo: { id: vehiculo.id },
          activo: true,
          estado: EstadoReserva.CONFIRMADA,
          fechaInicio: LessThan(fechaFinalizacion),
          fechaFinalizacion: MoreThan(fechaInicio),
        },
      });
      if (solapada) {
        throw new ConflictException(
          'El vehículo ya está reservado para esas fechas',
        );
      }

      if (vehiculo.estado !== EstadoVehiculo.RESERVADO) {
        vehiculo.estado = EstadoVehiculo.RESERVADO;
        await manager.save(Vehiculo, vehiculo);
      }

      const reserva = manager.create(Reserva, {
        cliente,
        vehiculo,
        fechaInicio,
        fechaFinalizacion,
        importeTotal: calcularImporte(
          vehiculo.precioDiario,
          fechaInicio,
          fechaFinalizacion,
        ),
        estado: EstadoReserva.CONFIRMADA,
        activo: true,
      });
      return manager.save(Reserva, reserva);
    });
  }
}
