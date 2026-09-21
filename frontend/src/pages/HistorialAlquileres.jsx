import { useNavigate } from 'react-router-dom';
import { Container, Table, Alert } from 'react-bootstrap';
import { useQuery } from '@apollo/client/react';
import NavBarCliente from '../components/NavBarCliente';
import { CONSULTAR_HISTORIAL } from '../graphql/historialQueries';
import { obtenerClienteActual } from '../utils/clienteActual';

const ESTADO_BADGE = {
  FINALIZADA: 'success',
  CANCELADA: 'secondary',
};

export default function HistorialAlquileres() {
  const navigate = useNavigate();
  const clienteActual = obtenerClienteActual();

  const { data, loading, error } = useQuery(CONSULTAR_HISTORIAL, {
    variables: { clienteId: clienteActual?.id },
    skip: !clienteActual,
    fetchPolicy: 'network-only',
  });

  if (!clienteActual) {
    return (
      <>
        <NavBarCliente />
        <Container className="mt-5">
          <Alert variant="warning">
            Todavía no te identificaste como cliente.{' '}
            <Alert.Link onClick={() => navigate('/cliente')}>Volver al inicio</Alert.Link>
          </Alert>
        </Container>
      </>
    );
  }

  const historial = data?.historialAlquileres || [];

  return (
    <>
      <NavBarCliente />
      <Container className="mt-4 mb-5">
        <h2 className="mb-4">Historial de Alquileres</h2>

        {error && <Alert variant="danger">Error al consultar el historial: {error.message}</Alert>}

        <Table striped bordered hover responsive>
          <thead className="table-dark">
            <tr>
              <th>Vehículo</th>
              <th>Patente</th>
              <th>Fecha Inicio</th>
              <th>Fecha Fin</th>
              <th>Cantidad de Días</th>
              <th>Importe Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {historial.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center text-muted">
                  {loading ? 'Cargando...' : 'Todavía no tenés alquileres finalizados ni reservas canceladas.'}
                </td>
              </tr>
            ) : (
              historial.map((h, i) => (
                <tr key={i}>
                  <td>{h.vehiculo}</td>
                  <td>{h.patente}</td>
                  <td>{new Date(h.fechaInicio).toLocaleString()}</td>
                  <td>{new Date(h.fechaFinalizacion).toLocaleString()}</td>
                  <td>{h.cantidadDias}</td>
                  <td className="fw-bold">${h.importeTotal}</td>
                  <td>
                    <span className={`badge bg-${ESTADO_BADGE[h.estado] || 'dark'}`}>{h.estado}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Container>
    </>
  );
}
