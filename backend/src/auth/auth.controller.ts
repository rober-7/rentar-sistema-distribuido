import {
  Body,
  Controller,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Inicia sesión y devuelve un JWT' })
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
  logout() {
    return;
  }
}
