import { Query, Resolver } from '@nestjs/graphql';
import { HistorialService } from './historial.service';
import { HistorialAlquiler } from './dto/historial-alquiler.type';
import { Authenticated } from '../auth/auth.guards';
import { Roles } from '../auth/roles.decorator';
import { RolUsuario } from '../clientes/enums/rol-usuario.enum';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
@Resolver()
export class HistorialResolver {
  constructor(private readonly historial: HistorialService) {}
  @Query(() => [HistorialAlquiler], {
    name: 'historialAlquileres',
    description: 'Historial del cliente autenticado.',
  })
  @Authenticated()
  @Roles(RolUsuario.CLIENTE)
  historialAlquileres(@CurrentUser() user: AuthenticatedUser) {
    return this.historial.porCliente(user.id);
  }
}
