import {
  Body,
  Controller,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Inicia sesión y devuelve un JWT' })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso. Devuelve el JWT y los datos del usuario.',
  })
  @ApiResponse({
    status: 400,
    description: 'email no tiene formato válido o falta algún campo',
  })
  @ApiResponse({
    status: 401,
    description:
      'Email o contraseña inválidos (incluye el caso de usuario inactivo: ' +
      'no se distingue de una contraseña incorrecta por seguridad)',
  })
  async login(@Body() dto: LoginDto) {
    const sesion = await this.auth.login(dto.email, dto.password);
    if (!sesion)
      throw new UnauthorizedException('Email o contraseña inválidos');
    return sesion;
  }
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Cierre de sesión cliente: se elimina el JWT en el navegador',
  })
  @ApiResponse({
    status: 204,
    description:
      'No hay nada que invalidar en el servidor (JWT sin estado): este ' +
      'endpoint solo existe para que el cliente tenga un llamado explícito ' +
      'de cierre de sesión',
  })
  logout() {
    return;
  }
}
