import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { RolUsuario } from './enums/rol-usuario.enum';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}
  async create(dto: CreateClienteDto): Promise<Usuario> {
    const [documento, email] = await Promise.all([
      this.usuariosRepository.findOne({ where: { documento: dto.documento } }),
      this.usuariosRepository.findOne({ where: { email: dto.email } }),
    ]);
    if (documento)
      throw new ConflictException(
        `Ya existe un cliente con el documento ${dto.documento}`,
      );
    if (email)
      throw new ConflictException(
        `Ya existe un cliente con el email ${dto.email}`,
      );
    const { password, ...datos } = dto;
    return this.usuariosRepository.save(
      this.usuariosRepository.create({
        ...datos,
        passwordHash: await bcrypt.hash(password, 12),
        rol: RolUsuario.CLIENTE,
        activo: true,
      }),
    );
  }
  findAll(): Promise<Usuario[]> {
    return this.usuariosRepository.find({ where: { rol: RolUsuario.CLIENTE } });
  }
  async findOne(id: number): Promise<Usuario> {
    const cliente = await this.usuariosRepository.findOne({
      where: { id, rol: RolUsuario.CLIENTE },
    });
    if (!cliente)
      throw new NotFoundException(`No existe un cliente con id ${id}`);
    return cliente;
  }
  async findByEmailWithPassword(email: string): Promise<Usuario | null> {
    return this.usuariosRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.passwordHash')
      .where('LOWER(usuario.email) = LOWER(:email)', { email })
      .getOne();
  }
  async findActiveUser(id: number): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({ where: { id, activo: true } });
  }
  async update(id: number, dto: UpdateClienteDto): Promise<Usuario> {
    const cliente = await this.findOne(id);
    this.usuariosRepository.merge(cliente, dto);
    return this.usuariosRepository.save(cliente);
  }
  async remove(id: number): Promise<Usuario> {
    const cliente = await this.findOne(id);
    cliente.activo = false;
    return this.usuariosRepository.save(cliente);
  }
}
