import { Args, Query, Resolver } from '@nestjs/graphql';
import { DisponibilidadService } from './disponibilidad.service';
import { FiltroDisponibilidadInput } from './dto/filtro-disponibilidad.input';
import { VehiculoDisponible } from './dto/vehiculo-disponible.type';

@Resolver()
export class DisponibilidadResolver {
  constructor(private readonly disponibilidadService: DisponibilidadService) {}

  @Query(() => [VehiculoDisponible], {
    name: 'vehiculosDisponibles',
    description:
      'Lista los vehículos disponibles para alquiler durante el período indicado, aplicando los filtros opcionales.',
  })
  vehiculosDisponibles(
    @Args('filtro') filtro: FiltroDisponibilidadInput,
  ): Promise<VehiculoDisponible[]> {
    return this.disponibilidadService.buscar(filtro);
  }
}
