import { useEffect, useState } from 'react';
import { Container, Form, Button, Row, Table, Alert, Card } from 'react-bootstrap';
import { useLazyQuery } from '@apollo/client/react';
import NavBar from '../components/NavBar';
import { CONSULTAR_RESERVAS } from '../graphql/reservasQueries';
import { obtenerClientes } from '../services/clientes.service';
import { obtenerVehiculos } from '../services/vehiculos.service';

const ESTADO_BADGE = {
  CONFIRMADA: 'success',
  CANCELADA: 'secondary',
};

const FILTRO_INICIAL = {
  clienteId: '',
  vehiculoId: '',
  tipoVehiculo: '',
  estado: '',
  desde: '',
  hasta: '',
};

export default function GestionReservas() {
  const [filtro, setFiltro] = useState(FILTRO_INICIAL);
  const [clientes, setClientes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [ejecutarBusqueda, { loading, data, error }] = useLazyQuery(CONSULTAR_RESERVAS);

  useEffect(() => {
    obtenerClientes().then(setClientes);
    obtenerVehiculos().then(setVehiculos);
    ejecutarBusqueda({ variables: { filtro: {} } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltro({ ...filtro, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const variablesFiltro = {
      ...(filtro.clienteId && { clienteId: parseInt(filtro.clienteId, 10) }),
      ...(filtro.vehiculoId && { vehiculoId: parseInt(filtro.vehiculoId, 10) }),
      ...(filtro.tipoVehiculo && { tipoVehiculo: filtro.tipoVehiculo }),
      ...(filtro.estado && { estado: filtro.estado }),
      ...(filtro.desde && { desde: new Date(filtro.desde).toISOString() }),
      ...(filtro.hasta && { hasta: new Date(filtro.hasta).toISOString() }),
    };

    ejecutarBusqueda({ variables: { filtro: variablesFiltro } });
  };

  const handleLimpiar = () => {
    setFiltro(FILTRO_INICIAL);
    ejecutarBusqueda({ variables: { filtro: {} } });
  };

  const reservas = data?.reservas || [];

  return (
    <>
      <NavBar />
      <Container className="mt-4 mb-5">
        <h2 className="mb-4">Gestión de Reservas</h2>

        <Card className="p-4 shadow-sm mb-4 bg-light">
          <Form onSubmit={handleSubmit}>
            <Row>
              <Form.Group className="col-md-3 mb-3">
                <Form.Label>Cliente</Form.Label>
                <Form.Select name="clienteId" value={filtro.clienteId} onChange={handleChange}>
                  <option value="">Todos</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="col-md-3 mb-3">
                <Form.Label>Vehículo</Form.Label>
                <Form.Select name="vehiculoId" value={filtro.vehiculoId} onChange={handleChange}>
                  <option value="">Todos</option>
                  {vehiculos.map((v) => (
                    <option key={v.id} value={v.id}>{v.patente} - {v.marca} {v.modelo}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="col-md-3 mb-3">
                <Form.Label>Tipo de Vehículo</Form.Label>
                <Form.Select name="tipoVehiculo" value={filtro.tipoVehiculo} onChange={handleChange}>
                  <option value="">Todos</option>
                  <option value="SEDAN">Sedán</option>
                  <option value="SUV">SUV</option>
                  <option value="PICKUP">Pick-Up</option>
                  <option value="COUPE">Coupé</option>
                  <option value="HATCHBACK">Hatchback</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="col-md-3 mb-3">
                <Form.Label>Estado</Form.Label>
                <Form.Select name="estado" value={filtro.estado} onChange={handleChange}>
                  <option value="">Todos</option>
                  <option value="CONFIRMADA">Confirmada</option>
                  <option value="CANCELADA">Cancelada</option>
                </Form.Select>
              </Form.Group>
            </Row>

            <Row>
              <Form.Group className="col-md-4 mb-3">
                <Form.Label>Desde</Form.Label>
                <Form.Control type="datetime-local" name="desde" value={filtro.desde} onChange={handleChange} />
              </Form.Group>

              <Form.Group className="col-md-4 mb-3">
                <Form.Label>Hasta</Form.Label>
                <Form.Control type="datetime-local" name="hasta" value={filtro.hasta} onChange={handleChange} />
              </Form.Group>
            </Row>

            <div className="text-end">
              <Button variant="secondary" className="me-2" onClick={handleLimpiar} type="button">Limpiar</Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
          </Form>
        </Card>

        {error && <Alert variant="danger">Error al consultar reservas: {error.message}</Alert>}

        <Table striped bordered hover responsive>
          <thead className="table-dark">
            <tr>
              <th>Cliente</th>
              <th>Vehículo</th>
              <th>Patente</th>
              <th>Fecha Inicio</th>
              <th>Fecha Fin</th>
              <th>Precio/Día</th>
              <th>Importe Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {reservas.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center text-muted">
                  {loading ? 'Consultando el servidor...' : 'No hay reservas para los filtros seleccionados.'}
                </td>
              </tr>
            ) : (
              reservas.map((r) => (
                <tr key={r.id}>
                  <td>{r.cliente}</td>
                  <td>{r.vehiculo}</td>
                  <td>{r.patente}</td>
                  <td>{new Date(r.fechaInicio).toLocaleString()}</td>
                  <td>{new Date(r.fechaFinalizacion).toLocaleString()}</td>
                  <td>${r.precioDiario}</td>
                  <td className="fw-bold">${r.importeTotal}</td>
                  <td>
                    <span className={`badge bg-${ESTADO_BADGE[r.estado] || 'dark'}`}>{r.estado}</span>
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
