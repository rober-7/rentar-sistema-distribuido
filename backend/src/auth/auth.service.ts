import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientGrpc } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { CLIENTE_PACKAGE } from '../clientes/clientes.constants';
import { ClienteServiceGrpcClient } from '../clientes/grpc/cliente-grpc.interface';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';

@Injectable()
export class AuthService implements OnModuleInit {
  private clienteGrpc: ClienteServiceGrpcClient;

  constructor(
    private readonly jwt: JwtService,
    @Inject(CLIENTE_PACKAGE) private readonly grpcClient: ClientGrpc,
  ) {}

  async onModuleInit() {
    this.clienteGrpc =
      this.grpcClient.getService<ClienteServiceGrpcClient>('ClienteService');

    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;

    // Bootstrap idempotente: se intenta crear en cada arranque y se ignora
    // el 409/ALREADY_EXISTS si el admin ya existe. Pasa por el mismo
    // CrearCliente que usa el ABM, con rol explícito en ADMIN (el DTO REST
    // público nunca expone ese campo, así que nadie más puede setearlo).
    try {
      await firstValueFrom(
        this.clienteGrpc.crearCliente({
          documento: process.env.ADMIN_DOCUMENTO ?? '40123123',
          nombre: process.env.ADMIN_NOMBRE ?? 'Juan',
          apellido: process.env.ADMIN_APELLIDO ?? 'Pérez',
          email,
          password,
          telefono: undefined,
          fechaNacimiento: '2000-01-01',
          rol: 'ADMIN',
        }),
      );
    } catch (error) {
      if (error?.code !== GrpcStatus.ALREADY_EXISTS) throw error;
    }
  }

  async login(email: string, password: string) {
    const respuesta = await firstValueFrom(
      this.clienteGrpc.validarLogin({ email, password }),
    );
    if (!respuesta.valido) return null;

    const user: AuthenticatedUser = {
      id: respuesta.id,
      email: respuesta.email,
      rol: respuesta.rol as AuthenticatedUser['rol'],
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

  /** Usado por JwtStrategy en cada request autenticado. */
  async usuarioSigueActivo(id: number): Promise<boolean> {
    try {
      const { activo } = await firstValueFrom(
        this.clienteGrpc.verificarActivo({ id }),
      );
      return activo;
    } catch (error) {
      if (error?.code === GrpcStatus.NOT_FOUND) return false;
      throw error;
    }
  }
}
