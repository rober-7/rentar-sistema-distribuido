import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { calcularImporte } from '../common/utils/calcular-importe';
import { FiltroDisponibilidadInput } from './dto/filtro-disponibilidad.input';
import { VehiculoDisponible } from './dto/vehiculo-disponible.type';
import { Reserva } from '../reservas/entities/reserva.entity';
import { EstadoReserva } from '../reservas/enums/estado-reserva.enum';

@Injectable()
export class DisponibilidadService {
  constructor(
    @InjectRepository(Vehiculo)
    private readonly vehiculosRepository: Repository<Vehiculo>,
  ) {}

  async buscar(
    filtro: FiltroDisponibilidadInput,
  ): Promise<VehiculoDisponible[]> {
    if (filtro.fechaFin <= filtro.fechaInicio) {
      throw new BadRequestException(
        'La fecha de finalización debe ser posterior a la fecha de inicio',
      );
    }

    const query = this.vehiculosRepository
      .createQueryBuilder('vehiculo')
      .where('vehiculo.activo = :activo', { activo: true })
      .andWhere((qb) => {
        const reservasSolapadas = qb
          .subQuery()
          .select('1')
          .from(Reserva, 'reserva')
          .where('reserva.vehiculo_id = vehiculo.id')
          .andWhere('reserva.activo = :reservaActiva')
          .andWhere('reserva.estado = :estadoReserva')
          .andWhere('reserva.fechaInicio < :fechaFin')
          .andWhere('reserva.fechaFinalizacion > :fechaInicio')
          .getQuery();
        return `NOT EXISTS ${reservasSolapadas}`;
      })
      .setParameters({
        reservaActiva: true,
        estadoReserva: EstadoReserva.CONFIRMADA,
        fechaInicio: filtro.fechaInicio,
        fechaFin: filtro.fechaFin,
      });

    if (filtro.tipoVehiculo) {
      query.andWhere('vehiculo.tipoVehiculo = :tipoVehiculo', {
        tipoVehiculo: filtro.tipoVehiculo,
      });
    }
    if (filtro.marca) {
      query.andWhere('vehiculo.marca ILIKE :marca', {
        marca: `%${filtro.marca}%`,
      });
    }
    if (filtro.modelo) {
      query.andWhere('vehiculo.modelo ILIKE :modelo', {
        modelo: `%${filtro.modelo}%`,
      });
    }
    if (filtro.precioMinimo !== undefined) {
      query.andWhere('vehiculo.precioDiario >= :precioMinimo', {
        precioMinimo: filtro.precioMinimo,
      });
    }
    if (filtro.precioMaximo !== undefined) {
      query.andWhere('vehiculo.precioDiario <= :precioMaximo', {
        precioMaximo: filtro.precioMaximo,
      });
    }

    const vehiculos = await query.getMany();

    return vehiculos.map((vehiculo) => ({
      id: vehiculo.id,
      patente: vehiculo.patente,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio,
      color: vehiculo.color,
      tipoVehiculo: vehiculo.tipoVehiculo,
      precioDiario: vehiculo.precioDiario,
      importeTotal: calcularImporte(
        vehiculo.precioDiario,
        filtro.fechaInicio,
        filtro.fechaFin,
      ),
    }));
  }
}
