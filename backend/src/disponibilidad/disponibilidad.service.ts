import {
  BadRequestException,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { calcularImporte } from '../common/utils/calcular-importe';
import { FiltroDisponibilidadInput } from './dto/filtro-disponibilidad.input';
import { VehiculoDisponible } from './dto/vehiculo-disponible.type';
import { VEHICULO_PACKAGE } from '../vehiculos/vehiculos.constants';
import { VehiculoServiceGrpcClient } from '../vehiculos/grpc/vehiculo-grpc.interface';
import { RENTAL_PACKAGE } from '../reservas/rental.constants';
import { ReservaServiceGrpcClient } from '../reservas/grpc/reserva-grpc.interface';

@Injectable()
export class DisponibilidadService implements OnModuleInit {
  private vehiculoGrpcService: VehiculoServiceGrpcClient;
  private reservaGrpcService: ReservaServiceGrpcClient;

  constructor(
    @Inject(VEHICULO_PACKAGE) private readonly grpcClient: ClientGrpc,
    @Inject(RENTAL_PACKAGE) private readonly rentalClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.vehiculoGrpcService =
      this.grpcClient.getService<VehiculoServiceGrpcClient>('VehiculoService');
    this.reservaGrpcService =
      this.rentalClient.getService<ReservaServiceGrpcClient>('ReservaService');
  }

  async buscar(
    filtro: FiltroDisponibilidadInput,
  ): Promise<VehiculoDisponible[]> {
    if (filtro.fechaFin <= filtro.fechaInicio) {
      throw new BadRequestException(
        'La fecha de finalización debe ser posterior a la fecha de inicio',
      );
    }
    if (
      filtro.precioMinimo !== undefined &&
      filtro.precioMaximo !== undefined &&
      filtro.precioMinimo > filtro.precioMaximo
    ) {
      throw new BadRequestException(
        'precioMinimo no puede ser mayor que precioMaximo',
      );
    }

    // Vehicle Service filtra sus datos propios y Rental Service informa qué
    // ids tienen reservas superpuestas. El Gateway compone ambos resultados
    // sin que ningún servicio lea la base de otro dominio.
    const [{ vehiculos }, { vehiculoIds }] = await Promise.all([
      firstValueFrom(
        this.vehiculoGrpcService.filtrarVehiculos({
          tipoVehiculo: filtro.tipoVehiculo,
          marca: filtro.marca,
          modelo: filtro.modelo,
          precioMinimo: filtro.precioMinimo,
          precioMaximo: filtro.precioMaximo,
        }),
      ),
      firstValueFrom(
        this.reservaGrpcService.consultarVehiculosOcupados({
          fechaInicio: filtro.fechaInicio.toISOString(),
          fechaFinalizacion: filtro.fechaFin.toISOString(),
        }),
      ),
    ]);
    const ocupados = new Set(vehiculoIds ?? []);

    return vehiculos
      .filter((vehiculo) => !ocupados.has(vehiculo.id))
      .map((vehiculo) => ({
        id: vehiculo.id,
        patente: vehiculo.patente,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        anio: vehiculo.anio,
        color: vehiculo.color ?? null,
        tipoVehiculo:
          vehiculo.tipoVehiculo as VehiculoDisponible['tipoVehiculo'],
        precioDiario: vehiculo.precioDiario,
        importeTotal: calcularImporte(
          vehiculo.precioDiario,
          filtro.fechaInicio,
          filtro.fechaFin,
        ),
      }));
  }
}
