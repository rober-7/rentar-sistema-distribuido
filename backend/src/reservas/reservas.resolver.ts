import { Args, Query, Resolver } from '@nestjs/graphql';
import { ReservasService } from './reservas.service';
import { FiltroReservasInput } from './dto/filtro-reservas.input';
import { ReservaConsulta } from './dto/reserva-consulta.type';

@Resolver(() => ReservaConsulta)
export class ReservasResolver {
  constructor(private readonly reservasService: ReservasService) {}

  @Query(() => [ReservaConsulta], {
    name: 'reservas',
    description: 'Consulta reservas aplicando filtros opcionales.',
  })
  reservas(
    @Args('filtro', { nullable: true }) filtro?: FiltroReservasInput,
  ): Promise<ReservaConsulta[]> {
    return this.reservasService.findAll(filtro ?? {});
  }
}
