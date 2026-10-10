import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { FiltroReservasInput } from './dto/filtro-reservas.input';
import { ReservaConsulta } from './dto/reserva-consulta.type';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RolUsuario } from '../clientes/enums/rol-usuario.enum';
import { ClienteServiceGrpcClient } from '../clientes/grpc/cliente-grpc.interface';
import { ClienteGrpc } from '../clientes/grpc/cliente-grpc.interface';
import { CLIENTE_PACKAGE } from '../clientes/clientes.constants';
import { VehiculoServiceGrpcClient } from '../vehiculos/grpc/vehiculo-grpc.interface';
import { VehiculoGrpc } from '../vehiculos/grpc/vehiculo-grpc.interface';
import { VEHICULO_PACKAGE } from '../vehiculos/vehiculos.constants';
import { RENTAL_PACKAGE } from './rental.constants';
import { ReservaGrpc, ReservaServiceGrpcClient } from './grpc/reserva-grpc.interface';

@Injectable()
export class ReservasService implements OnModuleInit {
  private reservasGrpc: ReservaServiceGrpcClient;
  private clientesGrpc: ClienteServiceGrpcClient;
  private vehiculosGrpc: VehiculoServiceGrpcClient;

  constructor(
    @Inject(RENTAL_PACKAGE) private readonly rentalClient: ClientGrpc,
    @Inject(CLIENTE_PACKAGE) private readonly customerClient: ClientGrpc,
    @Inject(VEHICULO_PACKAGE) private readonly vehicleClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.reservasGrpc =
      this.rentalClient.getService<ReservaServiceGrpcClient>('ReservaService');
    this.clientesGrpc =
      this.customerClient.getService<ClienteServiceGrpcClient>('ClienteService');
    this.vehiculosGrpc =
      this.vehicleClient.getService<VehiculoServiceGrpcClient>(
        'VehiculoService',
      );
  }

  async findAll(
    filtro: FiltroReservasInput,
    user: AuthenticatedUser,
  ): Promise<ReservaConsulta[]> {
    if (filtro.desde && filtro.hasta && filtro.hasta < filtro.desde)
      throw new BadRequestException(
        'La fecha de finalización del filtro debe ser posterior a la fecha de inicio',
      );

    const filtroAplicado =
      user.rol === RolUsuario.CLIENTE
        ? { ...filtro, clienteId: user.id }
        : filtro;
    const response = await firstValueFrom(
      this.reservasGrpc.consultarReservas({
        ...(filtroAplicado.clienteId !== undefined && {
          clienteId: filtroAplicado.clienteId,
        }),
        ...(filtroAplicado.estado && { estado: filtroAplicado.estado }),
      }),
    );
    const reservas = response.reservas ?? [];
    if (reservas.length === 0) return [];

    const [clientes, vehiculos] = await Promise.all([
      firstValueFrom(this.clientesGrpc.listarClientes({})),
      firstValueFrom(this.vehiculosGrpc.listarVehiculos({})),
    ]);
    const clientesPorId = new Map<number, ClienteGrpc>(
      (clientes.clientes ?? []).map((cliente) => [cliente.id, cliente]),
    );
    const vehiculosPorId = new Map<number, VehiculoGrpc>(
      (vehiculos.vehiculos ?? []).map((vehiculo) => [vehiculo.id, vehiculo]),
    );

    return reservas
      .filter((reserva) => {
        const vehiculo = vehiculosPorId.get(reserva.vehiculoId);
        if (!vehiculo) {
          throw new InternalServerErrorException(
            `No se pudieron resolver los datos del vehículo ${reserva.vehiculoId}`,
          );
        }
        if (
          filtroAplicado.vehiculoId &&
          reserva.vehiculoId !== filtroAplicado.vehiculoId
        )
          return false;
        if (
          filtroAplicado.tipoVehiculo &&
          vehiculo.tipoVehiculo !== filtroAplicado.tipoVehiculo
        )
          return false;
        if (
          filtroAplicado.desde &&
          new Date(reserva.fechaFinalizacion) < filtroAplicado.desde
        )
          return false;
        if (
          filtroAplicado.hasta &&
          new Date(reserva.fechaInicio) > filtroAplicado.hasta
        )
          return false;
        return true;
      })
      .map((reserva) => {
        const cliente = clientesPorId.get(reserva.clienteId);
        const vehiculo = vehiculosPorId.get(reserva.vehiculoId);
        if (!cliente || !vehiculo) {
          throw new InternalServerErrorException(
            `No se pudieron resolver los datos relacionados de la reserva ${reserva.id}`,
          );
        }
        return this.toReservaConsulta(reserva, cliente, vehiculo);
      });
  }

  async create(dto: CreateReservaDto, clienteId: number) {
    try {
      const [cliente, vehiculo] = await Promise.all([
        firstValueFrom(this.clientesGrpc.verificarActivo({ id: clienteId })),
        firstValueFrom(
          this.vehiculosGrpc.obtenerVehiculo({ id: dto.vehiculo }),
        ),
      ]);
      if (!cliente.activo) {
        throw new NotFoundException(
          `No existe un cliente activo con id ${clienteId}`,
        );
      }
      if (!vehiculo.activo) {
        throw new ConflictException('El vehículo está inactivo');
      }

      const disponibilidad = await firstValueFrom(
        this.vehiculosGrpc.consultarDisponibilidad({
          fechaInicio: dto.fechaInicio,
          fechaFinalizacion: dto.fechaFinalizacion,
        }),
      );
      if (
        !(disponibilidad.vehiculos ?? []).some(
          (disponible) => disponible.id === dto.vehiculo,
        )
      ) {
        throw new ConflictException(
          'El vehículo ya está reservado para esas fechas',
        );
      }

      const reserva = await firstValueFrom(
        this.reservasGrpc.crearReserva({
          vehiculoId: dto.vehiculo,
          clienteId,
          fechaInicio: dto.fechaInicio,
          fechaFinalizacion: dto.fechaFinalizacion,
        }),
      );
      return {
        id: reserva.id,
        vehiculo: { id: reserva.vehiculoId },
        cliente: { id: reserva.clienteId },
        fechaInicio: new Date(reserva.fechaInicio),
        fechaFinalizacion: new Date(reserva.fechaFinalizacion),
        importeTotal: reserva.importeTotal,
        estado: reserva.estado,
        activo: reserva.activo,
      };
    } catch (error) {
      this.mapGrpcError(error);
    }
  }

  async cancel(id: number, clienteId: number): Promise<ReservaGrpc> {
    try {
      return await firstValueFrom(
        this.reservasGrpc.cancelarReserva({ id, clienteId }),
      );
    } catch (error) {
      this.mapGrpcError(error);
    }
  }

  private toReservaConsulta(
    reserva: ReservaGrpc,
    cliente: ClienteGrpc,
    vehiculo: VehiculoGrpc,
  ): ReservaConsulta {
    return {
      id: reserva.id,
      cliente: `${cliente.nombre} ${cliente.apellido}`,
      clienteId: reserva.clienteId,
      vehiculo: `${vehiculo.marca} ${vehiculo.modelo}`,
      vehiculoId: reserva.vehiculoId,
      patente: vehiculo.patente,
      fechaInicio: new Date(reserva.fechaInicio),
      fechaFinalizacion: new Date(reserva.fechaFinalizacion),
      precioDiario: vehiculo.precioDiario,
      importeTotal: reserva.importeTotal,
      estado: reserva.estado as ReservaConsulta['estado'],
    };
  }

  private mapGrpcError(error: unknown): never {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? error.code
        : undefined;
    const details =
      typeof error === 'object' && error !== null && 'details' in error
        ? String(error.details)
        : 'Error al procesar la reserva';

    if (code === GrpcStatus.INVALID_ARGUMENT) throw new BadRequestException(details);
    if (code === GrpcStatus.NOT_FOUND) throw new NotFoundException(details);
    if (code === GrpcStatus.PERMISSION_DENIED)
      throw new ForbiddenException(details);
    if (
      code === GrpcStatus.ALREADY_EXISTS ||
      code === GrpcStatus.FAILED_PRECONDITION
    )
      throw new ConflictException(details);
    throw error;
  }
}
