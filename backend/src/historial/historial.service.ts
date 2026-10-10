import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { RENTAL_PACKAGE } from '../reservas/rental.constants';
import { ReservaServiceGrpcClient } from '../reservas/grpc/reserva-grpc.interface';
import { VEHICULO_PACKAGE } from '../vehiculos/vehiculos.constants';
import { VehiculoServiceGrpcClient } from '../vehiculos/grpc/vehiculo-grpc.interface';
import { calcularDias } from '../common/utils/calcular-importe';
import { HistorialAlquiler } from './dto/historial-alquiler.type';
import { EstadoHistorialAlquiler } from './enums/estado-historial-alquiler.enum';

@Injectable()
export class HistorialService implements OnModuleInit {
  private reservasGrpc: ReservaServiceGrpcClient;
  private vehiculosGrpc: VehiculoServiceGrpcClient;

  constructor(
    @Inject(RENTAL_PACKAGE) private readonly rentalClient: ClientGrpc,
    @Inject(VEHICULO_PACKAGE) private readonly vehicleClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.reservasGrpc =
      this.rentalClient.getService<ReservaServiceGrpcClient>('ReservaService');
    this.vehiculosGrpc =
      this.vehicleClient.getService<VehiculoServiceGrpcClient>(
        'VehiculoService',
      );
  }

  async porCliente(clienteId: number): Promise<HistorialAlquiler[]> {
    const response = await firstValueFrom(
      this.reservasGrpc.consultarHistorial({ clienteId }),
    );
    const reservas = response.reservas ?? [];
    if (reservas.length === 0) return [];

    const responseVehiculos = await firstValueFrom(
      this.vehiculosGrpc.listarVehiculos({}),
    );
    const vehiculosPorId = new Map(
      (responseVehiculos.vehiculos ?? []).map((vehiculo) => [
        vehiculo.id,
        vehiculo,
      ]),
    );

    return reservas.map((reserva) => {
      const vehiculo = vehiculosPorId.get(reserva.vehiculoId);
      if (!vehiculo) {
        throw new InternalServerErrorException(
          `No se pudieron resolver los datos del vehículo ${reserva.vehiculoId}`,
        );
      }
      const fechaInicio = new Date(reserva.fechaInicio);
      const fechaFinalizacion = new Date(reserva.fechaFinalizacion);
      return {
        vehiculo: `${vehiculo.marca} ${vehiculo.modelo}`,
        patente: vehiculo.patente,
        fechaInicio,
        fechaFinalizacion,
        cantidadDias: calcularDias(fechaInicio, fechaFinalizacion),
        importeTotal: reserva.importeTotal,
        estado:
          reserva.estado === 'CANCELADA'
            ? EstadoHistorialAlquiler.CANCELADA
            : EstadoHistorialAlquiler.FINALIZADA,
      };
    });
  }
}
