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

export const REGISTRAR_DEVOLUCION = gql`
  mutation RegistrarDevolucion($input: RegistrarDevolucionInput!) {
    registrarDevolucion(input: $input) {
      reservaId
      kilometrajeFinal
      estadoGeneral
      estado
      fechaDevolucion
      mensaje
    }
  }
`;
