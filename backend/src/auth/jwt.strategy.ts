import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ClientesService } from '../clientes/clientes.service';
import { RolUsuario } from '../clientes/enums/rol-usuario.enum';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly clientes: ClientesService) {
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
    const usuario = await this.clientes.findActiveUser(payload.sub);
    return { id: usuario.id, email: usuario.email, rol: usuario.rol };
  }
}
