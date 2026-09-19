import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Table, Button, Alert } from 'react-bootstrap';
import { useQuery } from '@apollo/client/react';
import NavBarCliente from '../components/NavBarCliente';
import { CONSULTAR_RESERVAS } from '../graphql/reservasQueries';
import { cancelarReserva } from '../services/reservas.service';
import { obtenerClienteActual } from '../utils/clienteActual';
import Swal from 'sweetalert2';

const ESTADO_BADGE = {
  CONFIRMADA: 'success',
  CANCELADA: 'secondary',
};

export default function MisReservas() {
  const navigate = useNavigate();
  const clienteActual = obtenerClienteActual();
  const [cancelandoId, setCancelandoId] = useState(null);

  const { data, loading, error, refetch } = useQuery(CONSULTAR_RESERVAS, {
    variables: { filtro: { clienteId: clienteActual?.id } },
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

  const reservas = data?.reservas || [];

  const puedeCancelar = (reserva) =>
    reserva.estado === 'CONFIRMADA' && new Date(reserva.fechaInicio) > new Date();

  const handleCancelar = async (reserva) => {
    const confirmacion = await Swal.fire({
      title: '¿Cancelar reserva?',
      text: `Vas a cancelar la reserva del ${reserva.vehiculo} (${reserva.patente}).`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver',
    });
    if (!confirmacion.isConfirmed) return;

    setCancelandoId(reserva.id);
    try {
      await cancelarReserva(reserva.id);
      await Swal.fire('Cancelada', 'La reserva fue cancelada correctamente.', 'success');
      refetch();
    } catch (error) {
      Swal.fire('No se pudo cancelar', error.message, 'error');
    } finally {
      setCancelandoId(null);
    }
  };

  return (
    <>
      <NavBarCliente />
      <Container className="mt-4 mb-5">
        <h2 className="mb-4">Mis Reservas</h2>

        {error && <Alert variant="danger">Error al consultar tus reservas: {error.message}</Alert>}

        <Table striped bordered hover responsive>
          <thead className="table-dark">
            <tr>
              <th>Vehículo</th>
              <th>Patente</th>
              <th>Fecha Inicio</th>
              <th>Fecha Fin</th>
              <th>Precio/Día</th>
              <th>Importe Total</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {reservas.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center text-muted">
                  {loading ? 'Cargando...' : 'Todavía no hiciste ninguna reserva.'}
                </td>
              </tr>
            ) : (
              reservas.map((r) => (
                <tr key={r.id}>
                  <td>{r.vehiculo}</td>
                  <td>{r.patente}</td>
                  <td>{new Date(r.fechaInicio).toLocaleString()}</td>
                  <td>{new Date(r.fechaFinalizacion).toLocaleString()}</td>
                  <td>${r.precioDiario}</td>
                  <td className="fw-bold">${r.importeTotal}</td>
                  <td>
                    <span className={`badge bg-${ESTADO_BADGE[r.estado] || 'dark'}`}>{r.estado}</span>
                  </td>
                  <td>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={!puedeCancelar(r) || cancelandoId === r.id}
                      onClick={() => handleCancelar(r)}
                    >
                      {cancelandoId === r.id ? 'Cancelando...' : 'Cancelar'}
                    </Button>
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
