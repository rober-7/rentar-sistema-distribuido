import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ReservasService } from './reservas.service';
import { FiltroReservasInput } from './dto/filtro-reservas.input';
import { ReservaConsulta } from './dto/reserva-consulta.type';
import { RegistrarDevolucionInput } from './dto/registrar-devolucion.input';
import { DevolucionResponse } from './dto/devolucion-response.type';
import { Authenticated } from '../auth/auth.guards';
import { Roles } from '../auth/roles.decorator';
import { RolUsuario } from '../clientes/enums/rol-usuario.enum';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
@Resolver(() => ReservaConsulta)
export class ReservasResolver {
  constructor(private readonly reservasService: ReservasService) {}
  @Query(() => [ReservaConsulta], {
    name: 'reservas',
    description:
      'El cliente ve solo sus reservas; el administrador puede ver todas.',
  })
  @Authenticated()
  @Roles(RolUsuario.ADMIN, RolUsuario.CLIENTE)
  reservas(
    @Args('filtro', { nullable: true }) filtro: FiltroReservasInput | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservasService.findAll(filtro ?? {}, user);
  }

  @Mutation(() => DevolucionResponse, {
    name: 'registrarDevolucion',
    description:
      'Registra la devolución de un vehículo indicando reserva, kilometraje final y estado general.',
  })
  @Authenticated()
  @Roles(RolUsuario.ADMIN, RolUsuario.CLIENTE)
  registrarDevolucion(@Args('input') input: RegistrarDevolucionInput) {
    return this.reservasService.registrarDevolucion(input);
  }
}
