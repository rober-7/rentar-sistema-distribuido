import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { HistorialService } from './historial.service';
import { HistorialAlquiler } from './dto/historial-alquiler.type';

@Resolver()
export class HistorialResolver {
  constructor(private readonly historialService: HistorialService) {}

  @Query(() => [HistorialAlquiler], {
    name: 'historialAlquileres',
    description:
      'Historial de alquileres de un cliente: alquileres finalizados y reservas canceladas.',
  })
  historialAlquileres(
    @Args('clienteId', { type: () => Int }) clienteId: number,
  ): Promise<HistorialAlquiler[]> {
    return this.historialService.porCliente(clienteId);
  }
}
