import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehiculo } from './entities/vehiculo.entity';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { UpdateVehiculoDto } from './dto/update-vehiculo.dto';
import { EstadoVehiculo } from './enums/estado-vehiculo.enum';

@Injectable()
export class VehiculosService {
  constructor(
    @InjectRepository(Vehiculo)
    private readonly vehiculosRepository: Repository<Vehiculo>,
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

  findAll(): Promise<Vehiculo[]> {
    return this.vehiculosRepository.find();
  }

  async findOne(id: number): Promise<Vehiculo> {
    const vehiculo = await this.vehiculosRepository.findOne({ where: { id } });
    if (!vehiculo) {
      throw new NotFoundException(`No existe un vehículo con id ${id}`);
    }
    return vehiculo;
  }

  async update(id: number, updateVehiculoDto: UpdateVehiculoDto): Promise<Vehiculo> {
    const vehiculo = await this.findOne(id);
    this.vehiculosRepository.merge(vehiculo, updateVehiculoDto);
    return this.vehiculosRepository.save(vehiculo);
  }

  async remove(id: number): Promise<Vehiculo> {
    const vehiculo = await this.findOne(id);
    vehiculo.activo = false;
    return this.vehiculosRepository.save(vehiculo);
  }
}
