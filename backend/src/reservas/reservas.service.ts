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
import { FiltroReservasInput } from './dto/filtro-reservas.input';
import { ReservaConsulta } from './dto/reserva-consulta.type';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { calcularImporte } from '../common/utils/calcular-importe';
import { EstadoReserva } from './enums/estado-reserva.enum';

@Injectable()
export class ReservasService {
  constructor(
    @InjectRepository(Reserva)
    private readonly reservasRepository: Repository<Reserva>,
  ) {}

  async findAll(filtro: FiltroReservasInput): Promise<ReservaConsulta[]> {
    if (filtro.desde && filtro.hasta && filtro.hasta < filtro.desde) {
      throw new BadRequestException(
        'La fecha de finalización del filtro debe ser posterior a la fecha de inicio',
      );
    }

    const query = this.reservasRepository
      .createQueryBuilder('reserva')
      .innerJoinAndSelect('reserva.cliente', 'cliente')
      .innerJoinAndSelect('reserva.vehiculo', 'vehiculo')
      .orderBy('reserva.fechaInicio', 'DESC');

    if (filtro.clienteId) {
      query.andWhere('cliente.id = :clienteId', {
        clienteId: filtro.clienteId,
      });
    }
    if (filtro.vehiculoId) {
      query.andWhere('vehiculo.id = :vehiculoId', {
        vehiculoId: filtro.vehiculoId,
      });
    }
    if (filtro.tipoVehiculo) {
      query.andWhere('vehiculo.tipoVehiculo = :tipoVehiculo', {
        tipoVehiculo: filtro.tipoVehiculo,
      });
    }
    if (filtro.estado) {
      query.andWhere('reserva.estado = :estado', { estado: filtro.estado });
    }
    if (filtro.desde) {
      query.andWhere('reserva.fechaFinalizacion >= :desde', {
        desde: filtro.desde,
      });
    }
    if (filtro.hasta) {
      query.andWhere('reserva.fechaInicio <= :hasta', {
        hasta: filtro.hasta,
      });
    }

    const reservas = await query.getMany();

    return reservas.map((reserva) => ({
      id: reserva.id,
      cliente: `${reserva.cliente.nombre} ${reserva.cliente.apellido}`,
      clienteId: reserva.cliente.id,
      vehiculo: `${reserva.vehiculo.marca} ${reserva.vehiculo.modelo}`,
      vehiculoId: reserva.vehiculo.id,
      patente: reserva.vehiculo.patente,
      fechaInicio: reserva.fechaInicio,
      fechaFinalizacion: reserva.fechaFinalizacion,
      precioDiario: reserva.vehiculo.precioDiario,
      importeTotal: reserva.importeTotal,
      estado: reserva.estado,
    }));
  }

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

  async cancel(id: number): Promise<Reserva> {
    return this.reservasRepository.manager.transaction(async (manager) => {
      const reserva = await manager.findOne(Reserva, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!reserva) {
        throw new NotFoundException(`No existe una reserva con id ${id}`);
      }
      if (reserva.estado === EstadoReserva.CANCELADA) {
        throw new ConflictException('La reserva ya está cancelada');
      }
      if (reserva.fechaInicio.getTime() <= Date.now()) {
        throw new ConflictException(
          'No se puede cancelar una reserva cuyo alquiler ya comenzó',
        );
      }

      reserva.estado = EstadoReserva.CANCELADA;
      return manager.save(Reserva, reserva);
    });
  }
}
