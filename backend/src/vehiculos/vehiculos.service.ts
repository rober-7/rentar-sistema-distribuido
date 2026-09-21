import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { Vehiculo } from './entities/vehiculo.entity';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { UpdateVehiculoDto } from './dto/update-vehiculo.dto';
import { EstadoVehiculo } from './enums/estado-vehiculo.enum';
import { Reserva } from '../reservas/entities/reserva.entity';
import { EstadoReserva } from '../reservas/enums/estado-reserva.enum';

@Injectable()
export class VehiculosService {
  constructor(
    @InjectRepository(Vehiculo)
    private readonly vehiculosRepository: Repository<Vehiculo>,
    @InjectRepository(Reserva)
    private readonly reservasRepository: Repository<Reserva>,
  ) {}

  async create(createVehiculoDto: CreateVehiculoDto): Promise<Vehiculo> {
    const existente = await this.vehiculosRepository.findOne({
      where: { patente: createVehiculoDto.patente },
    });
    if (existente) {
      throw new ConflictException(
        `Ya existe un vehículo con la patente ${createVehiculoDto.patente}`,
      );
    }

    const vehiculo = this.vehiculosRepository.create({
      ...createVehiculoDto,
      estado: EstadoVehiculo.DISPONIBLE,
      activo: true,
    });
    return this.vehiculosRepository.save(vehiculo);
  }

  async findAll(): Promise<Vehiculo[]> {
    const vehiculos = await this.vehiculosRepository.find();
    return this.conEstadoDerivado(vehiculos);
  }

  async findOne(id: number): Promise<Vehiculo> {
    const vehiculo = await this.vehiculosRepository.findOne({ where: { id } });
    if (!vehiculo) {
      throw new NotFoundException(`No existe un vehículo con id ${id}`);
    }
    const [conEstado] = await this.conEstadoDerivado([vehiculo]);
    return conEstado;
  }

  async update(
    id: number,
    updateVehiculoDto: UpdateVehiculoDto,
  ): Promise<Vehiculo> {
    const vehiculo = await this.findOne(id);
    this.vehiculosRepository.merge(vehiculo, updateVehiculoDto);
    const guardado = await this.vehiculosRepository.save(vehiculo);
    const [conEstado] = await this.conEstadoDerivado([guardado]);
    return conEstado;
  }

  async remove(id: number): Promise<Vehiculo> {
    const vehiculo = await this.findOne(id);
    vehiculo.activo = false;
    const guardado = await this.vehiculosRepository.save(vehiculo);
    const [conEstado] = await this.conEstadoDerivado([guardado]);
    return conEstado;
  }

  /**
   * El estado del vehículo no se persiste como decisión de negocio: se deriva de sus
   * reservas CONFIRMADAS vigentes. Así, cancelar una reserva o que un período termine
   * no puede dejar a un vehículo trabado en RESERVADO/EN_ALQUILER.
   */
  private async conEstadoDerivado(vehiculos: Vehiculo[]): Promise<Vehiculo[]> {
    if (vehiculos.length === 0) {
      return vehiculos;
    }

    const ahora = new Date();
    const reservasVigentes = await this.reservasRepository.find({
      where: {
        activo: true,
        estado: EstadoReserva.CONFIRMADA,
        fechaFinalizacion: MoreThan(ahora),
        vehiculo: { id: In(vehiculos.map((v) => v.id)) },
      },
      relations: { vehiculo: true },
    });

    const iniciosPorVehiculo = new Map<number, Date[]>();
    for (const reserva of reservasVigentes) {
      const inicios = iniciosPorVehiculo.get(reserva.vehiculo.id) ?? [];
      inicios.push(reserva.fechaInicio);
      iniciosPorVehiculo.set(reserva.vehiculo.id, inicios);
    }

    return vehiculos.map((vehiculo) => {
      const inicios = iniciosPorVehiculo.get(vehiculo.id) ?? [];
      if (inicios.some((inicio) => inicio <= ahora)) {
        vehiculo.estado = EstadoVehiculo.EN_ALQUILER;
      } else if (inicios.length > 0) {
        vehiculo.estado = EstadoVehiculo.RESERVADO;
      } else {
        vehiculo.estado = EstadoVehiculo.DISPONIBLE;
      }
      return vehiculo;
    });
  }
}
