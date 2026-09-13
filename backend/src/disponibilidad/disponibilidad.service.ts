import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { EstadoVehiculo } from '../vehiculos/enums/estado-vehiculo.enum';
import { FiltroDisponibilidadInput } from './dto/filtro-disponibilidad.input';
import { VehiculoDisponible } from './dto/vehiculo-disponible.type';

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
      .andWhere('vehiculo.estado = :estado', {
        estado: EstadoVehiculo.DISPONIBLE,
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

    // Nota: cuando exista el ABM de reservas, acá debería excluirse todo
    // vehículo con una reserva CONFIRMADA que se solape con
    // [filtro.fechaInicio, filtro.fechaFin]. Por ahora la disponibilidad
    // se resuelve únicamente con el estado actual del vehículo.
    const vehiculos = await query.getMany();

    return vehiculos.map((vehiculo) => ({
      patente: vehiculo.patente,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio,
      color: vehiculo.color,
      tipoVehiculo: vehiculo.tipoVehiculo,
      precioDiario: vehiculo.precioDiario,
    }));
  }
}
