import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ClientsModule } from '@nestjs/microservices';
import { clienteGrpcClientOptions } from '../clientes/clientes.grpc-client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    // El login y la verificación de usuario activo pasan por gRPC al
    // Customer Service: el Gateway ya no accede a la tabla "usuarios"
    // directamente para nada relacionado con autenticación.
    ClientsModule.register([clienteGrpcClientOptions()]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'solo-desarrollo-cambiar-esta-clave',
      signOptions: { expiresIn: '2h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
