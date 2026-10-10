import { Injectable, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../clientes/entities/usuario.entity';
import { RolUsuario } from '../clientes/enums/rol-usuario.enum';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly jwt: JwtService,
    // El AuthService interactúa directo con la tabla para temas de Login
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
  ) {}
  async onModuleInit() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;
    const existe = await this.usuarios.findOne({ where: { email } });
    if (!existe)
      await this.usuarios.save(
        this.usuarios.create({
          documento: process.env.ADMIN_DOCUMENTO ?? '40123123',
          nombre: process.env.ADMIN_NOMBRE ?? 'Juan',
          apellido: process.env.ADMIN_APELLIDO ?? 'Pérez',
          email,
          passwordHash: await bcrypt.hash(password, 12),
          rol: RolUsuario.ADMIN,
          activo: true,
          telefono: null,
          fechaNacimiento: '2000-01-01',
        }),
      );
  }
  async login(email: string, password: string) {
    // Buscamos el usuario directamente desde este repositorio
    const usuario = await this.usuarios
      .createQueryBuilder('usuario')
      .addSelect('usuario.passwordHash')
      .where('LOWER(usuario.email) = LOWER(:email)', { email })
      .getOne();
    if (
      !usuario ||
      !usuario.activo ||
      !(await bcrypt.compare(password, usuario.passwordHash))
    )
      return null;
    const user: AuthenticatedUser = {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };
    return {
      accessToken: await this.jwt.signAsync({
        sub: user.id,
        email: user.email,
        rol: user.rol,
      }),
      usuario: user,
    };
  }
  async findActiveUser(id: number): Promise<Usuario | null> {
    return this.usuarios.findOne({ where: { id, activo: true } });
  }
}
