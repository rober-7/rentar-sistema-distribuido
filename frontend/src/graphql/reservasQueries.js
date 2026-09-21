import { gql } from '@apollo/client';

export const CONSULTAR_RESERVAS = gql`
  query Reservas($filtro: FiltroReservasInput) {
    reservas(filtro: $filtro) {
      id
      cliente
      clienteId
      vehiculo
      vehiculoId
      patente
      fechaInicio
      fechaFinalizacion
      precioDiario
      importeTotal
      estado
    }
  }
`;
