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

@Injectable()
export class DisponibilidadService implements OnModuleInit {
  private vehiculoGrpcService: VehiculoServiceGrpcClient;

  constructor(
    @Inject(VEHICULO_PACKAGE) private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.vehiculoGrpcService =
      this.grpcClient.getService<VehiculoServiceGrpcClient>(
        'VehiculoService',
      );
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

    // El filtrado de disponibilidad (qué vehículos están libres en el
    // período, con sus filtros de marca/modelo/tipo/precio) es una regla del
    // dominio Vehículos y vive en el Vehicle Service. El Gateway solo arma
    // la respuesta para la interfaz web calculando el importe del período
    // (no es información propia del vehículo: combina su precioDiario con
    // fechas que pide el cliente).
    const { vehiculos } = await firstValueFrom(
      this.vehiculoGrpcService.consultarDisponibilidad({
        fechaInicio: filtro.fechaInicio.toISOString(),
        fechaFinalizacion: filtro.fechaFin.toISOString(),
        tipoVehiculo: filtro.tipoVehiculo,
        marca: filtro.marca,
        modelo: filtro.modelo,
        precioMinimo: filtro.precioMinimo,
        precioMaximo: filtro.precioMaximo,
      }),
    );

    return vehiculos.map((vehiculo) => ({
      id: vehiculo.id,
      patente: vehiculo.patente,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio,
      color: vehiculo.color ?? null,
      tipoVehiculo: vehiculo.tipoVehiculo as VehiculoDisponible['tipoVehiculo'],
      precioDiario: vehiculo.precioDiario,
      importeTotal: calcularImporte(
        vehiculo.precioDiario,
        filtro.fechaInicio,
        filtro.fechaFin,
      ),
    }));
  }
}
