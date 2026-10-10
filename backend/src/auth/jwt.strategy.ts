import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { RolUsuario } from '../clientes/enums/rol-usuario.enum';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET ?? 'solo-desarrollo-cambiar-esta-clave',
    });
  }

  async validate(payload: {
    sub: number;
    email: string;
    rol: RolUsuario;
  }): Promise<AuthenticatedUser> {
    // El payload del JWT ya viene firmado por este mismo Gateway (confiable):
    // no hace falta volver a pedirle email/rol al Customer Service en cada
    // request, solo confirmar que el usuario siga existiendo y activo (por
    // si se desactivó la cuenta después de emitido el token).
    const activo = await this.authService.usuarioSigueActivo(payload.sub);
    if (!activo) {
      throw new UnauthorizedException('Usuario inactivo o inexistente');
    }
    return { id: payload.sub, email: payload.email, rol: payload.rol };
  }
}
