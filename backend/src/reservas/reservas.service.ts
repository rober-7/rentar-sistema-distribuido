import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { Reserva } from './entities/reserva.entity';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { FiltroReservasInput } from './dto/filtro-reservas.input';
import { ReservaConsulta } from './dto/reserva-consulta.type';
import { Usuario } from '../clientes/entities/usuario.entity';
import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { calcularImporte } from '../common/utils/calcular-importe';
import { EstadoReserva } from './enums/estado-reserva.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RolUsuario } from '../clientes/enums/rol-usuario.enum';
@Injectable()
export class ReservasService {
  constructor(
    @InjectRepository(Reserva) private readonly reservas: Repository<Reserva>,
  ) {}
  async findAll(
    filtro: FiltroReservasInput,
    user: AuthenticatedUser,
  ): Promise<ReservaConsulta[]> {
    if (filtro.desde && filtro.hasta && filtro.hasta < filtro.desde)
      throw new BadRequestException(
        'La fecha de finalización del filtro debe ser posterior a la fecha de inicio',
      );
    const query = this.reservas
      .createQueryBuilder('reserva')
      .innerJoinAndSelect('reserva.cliente', 'cliente')
      .innerJoinAndSelect('reserva.vehiculo', 'vehiculo')
      .orderBy('reserva.fechaInicio', 'DESC');
    if (user.rol === RolUsuario.CLIENTE)
      filtro = { ...filtro, clienteId: user.id };
    if (filtro.clienteId)
      query.andWhere('cliente.id = :clienteId', {
        clienteId: filtro.clienteId,
      });
    if (filtro.vehiculoId)
      query.andWhere('vehiculo.id = :vehiculoId', {
        vehiculoId: filtro.vehiculoId,
      });
    if (filtro.tipoVehiculo)
      query.andWhere('vehiculo.tipoVehiculo = :tipoVehiculo', {
        tipoVehiculo: filtro.tipoVehiculo,
      });
    if (filtro.estado)
      query.andWhere('reserva.estado = :estado', { estado: filtro.estado });
    if (filtro.desde)
      query.andWhere('reserva.fechaFinalizacion >= :desde', {
        desde: filtro.desde,
      });
    if (filtro.hasta)
      query.andWhere('reserva.fechaInicio <= :hasta', { hasta: filtro.hasta });
    return (await query.getMany()).map((r) => ({
      id: r.id,
      cliente: `${r.cliente.nombre} ${r.cliente.apellido}`,
      clienteId: r.cliente.id,
      vehiculo: `${r.vehiculo.marca} ${r.vehiculo.modelo}`,
      vehiculoId: r.vehiculo.id,
      patente: r.vehiculo.patente,
      fechaInicio: r.fechaInicio,
      fechaFinalizacion: r.fechaFinalizacion,
      precioDiario: r.vehiculo.precioDiario,
      importeTotal: r.importeTotal,
      estado: r.estado,
    }));
  }
  async create(dto: CreateReservaDto, clienteId: number): Promise<Reserva> {
    const inicio = new Date(dto.fechaInicio),
      fin = new Date(dto.fechaFinalizacion);
    if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fin.getTime()))
      throw new BadRequestException('Las fechas deben ser válidas');
    if (inicio.getTime() <= Date.now())
      throw new BadRequestException('La fecha de inicio debe ser futura');
    if (fin <= inicio)
      throw new BadRequestException(
        'La fecha de finalización debe ser posterior a la fecha de inicio',
      );
    return this.reservas.manager.transaction(async (manager) => {
      const vehiculo = await manager.findOne(Vehiculo, {
        where: { id: dto.vehiculo },
        lock: { mode: 'pessimistic_write' },
      });
      const cliente = await manager.findOne(Usuario, {
        where: { id: clienteId, activo: true },
        lock: { mode: 'pessimistic_read' },
      });
      if (!vehiculo) throw new NotFoundException('No existe el vehículo');
      if (!cliente) throw new NotFoundException('No existe el cliente activo');
      if (!vehiculo.activo)
        throw new ConflictException('El vehículo está inactivo');
      const solapada = await manager.exists(Reserva, {
        where: {
          vehiculo: { id: vehiculo.id },
          activo: true,
          estado: EstadoReserva.CONFIRMADA,
          fechaInicio: LessThan(fin),
          fechaFinalizacion: MoreThan(inicio),
        },
      });
      if (solapada)
        throw new ConflictException(
          'El vehículo ya está reservado para esas fechas',
        );
      return manager.save(
        Reserva,
        manager.create(Reserva, {
          cliente,
          vehiculo,
          fechaInicio: inicio,
          fechaFinalizacion: fin,
          importeTotal: calcularImporte(vehiculo.precioDiario, inicio, fin),
          estado: EstadoReserva.CONFIRMADA,
          activo: true,
        }),
      );
    });
  }
  async cancel(id: number, clienteId: number): Promise<Reserva> {
    return this.reservas.manager.transaction(async (manager) => {
      const reserva = await manager.findOne(Reserva, {
        where: { id },
        relations: { cliente: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!reserva)
        throw new NotFoundException(`No existe una reserva con id ${id}`);
      if (reserva.cliente.id !== clienteId)
        throw new ForbiddenException(
          'No podés cancelar una reserva de otro cliente',
        );
      if (reserva.estado === EstadoReserva.CANCELADA)
        throw new ConflictException('La reserva ya está cancelada');
      if (reserva.fechaInicio.getTime() <= Date.now())
        throw new ConflictException(
          'No se puede cancelar una reserva cuyo alquiler ya comenzó',
        );
      reserva.estado = EstadoReserva.CANCELADA;
      return manager.save(reserva);
    });
  }
}
