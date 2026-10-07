import { Args, Query, Resolver } from '@nestjs/graphql';
import { DisponibilidadService } from './disponibilidad.service';
import { FiltroDisponibilidadInput } from './dto/filtro-disponibilidad.input';
import { VehiculoDisponible } from './dto/vehiculo-disponible.type';
import { Authenticated } from '../auth/auth.guards';
import { Roles } from '../auth/roles.decorator';
import { RolUsuario } from '../clientes/enums/rol-usuario.enum';
@Resolver()
export class DisponibilidadResolver {
  constructor(private readonly disponibilidad: DisponibilidadService) {}
  @Query(() => [VehiculoDisponible], {
    name: 'vehiculosDisponibles',
    description: 'Vehículos disponibles en el período solicitado.',
  })
  @Authenticated()
  @Roles(RolUsuario.CLIENTE)
  vehiculosDisponibles(@Args('filtro') filtro: FiltroDisponibilidadInput) {
    return this.disponibilidad.buscar(filtro);
  }
}
