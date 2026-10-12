import { gql } from "@apollo/client";
export const CONSULTAR_HISTORIAL = gql`
  query HistorialAlquileres {
    historialAlquileres {
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
