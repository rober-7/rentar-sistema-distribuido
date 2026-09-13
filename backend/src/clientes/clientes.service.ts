import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from './entities/cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clientesRepository: Repository<Cliente>,
  ) {}

  async create(createClienteDto: CreateClienteDto): Promise<Cliente> {
    const [existenteDocumento, existenteEmail] = await Promise.all([
      this.clientesRepository.findOne({
        where: { documento: createClienteDto.documento },
      }),
      this.clientesRepository.findOne({
        where: { email: createClienteDto.email },
      }),
    ]);

    if (existenteDocumento) {
      throw new ConflictException(
        `Ya existe un cliente con el documento ${createClienteDto.documento}`,
      );
    }
    if (existenteEmail) {
      throw new ConflictException(
        `Ya existe un cliente con el email ${createClienteDto.email}`,
      );
    }

    const cliente = this.clientesRepository.create({
      ...createClienteDto,
      activo: true,
    });
    return this.clientesRepository.save(cliente);
  }

  findAll(): Promise<Cliente[]> {
    return this.clientesRepository.find();
  }

  async findOne(id: number): Promise<Cliente> {
    const cliente = await this.clientesRepository.findOne({ where: { id } });
    if (!cliente) {
      throw new NotFoundException(`No existe un cliente con id ${id}`);
    }
    return cliente;
  }

  async update(
    id: number,
    updateClienteDto: UpdateClienteDto,
  ): Promise<Cliente> {
    const cliente = await this.findOne(id);
    this.clientesRepository.merge(cliente, updateClienteDto);
    return this.clientesRepository.save(cliente);
  }

  async remove(id: number): Promise<Cliente> {
    const cliente = await this.findOne(id);
    cliente.activo = false;
    // Nota: Los clientes inactivos no podrán realizar nuevos alquileres.
    return this.clientesRepository.save(cliente);
  }
}
