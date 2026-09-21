import { gql } from '@apollo/client';

export const CONSULTAR_HISTORIAL = gql`
  query HistorialAlquileres($clienteId: Int!) {
    historialAlquileres(clienteId: $clienteId) {
      vehiculo
      patente
      fechaInicio
      fechaFinalizacion
      cantidadDias
      importeTotal
      estado
    }
  }
`;
