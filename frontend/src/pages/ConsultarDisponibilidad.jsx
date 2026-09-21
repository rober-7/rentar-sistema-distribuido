import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Row, Col, Card, Table, Alert } from 'react-bootstrap';
import { gql } from '@apollo/client';
import { useLazyQuery } from '@apollo/client/react';
import NavBarCliente from '../components/NavBarCliente';
import { crearReserva } from '../services/reservas.service';
import { obtenerClienteActual } from '../utils/clienteActual';
import Swal from 'sweetalert2';

// Definimos la query de GraphQL como la espera el backend
const BUSCAR_DISPONIBILIDAD = gql`
  query VehiculosDisponibles($filtro: FiltroDisponibilidadInput!) {
    vehiculosDisponibles(filtro: $filtro) {
      id
      patente
      marca
      modelo
      anio
      color
      tipoVehiculo
      precioDiario
      importeTotal
    }
  }
`;

export default function ConsultarDisponibilidad() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState({
    fechaInicio: '',
    fechaFin: '',
    tipoVehiculo: '',
    marca: '',
    modelo: '',
    precioMinimo: '',
    precioMaximo: ''
  });

  // Hook de Apollo para ejecutar la query bajo demanda (se añadió 'const')
  const [ejecutarBusqueda, { loading, data, error }] = useLazyQuery(BUSCAR_DISPONIBILIDAD);
  const [periodoConsultado, setPeriodoConsultado] = useState(null);
  const [reservandoId, setReservandoId] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltro({ ...filtro, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!filtro.fechaInicio || !filtro.fechaFin) {
      Swal.fire('Atención', 'Debes seleccionar las fechas de inicio y fin.', 'warning');
      return;
    }

    // Preparamos las variables limpiando campos vacíos opcionales para no romper el tipado
    const variablesFiltro = {
      // GraphQL espera fechas en formato ISO string
      fechaInicio: new Date(filtro.fechaInicio).toISOString(),
      fechaFin: new Date(filtro.fechaFin).toISOString(),
      ...(filtro.tipoVehiculo && { tipoVehiculo: filtro.tipoVehiculo }),
      ...(filtro.marca && { marca: filtro.marca }),
      ...(filtro.modelo && { modelo: filtro.modelo }),
      ...(filtro.precioMinimo && { precioMinimo: parseFloat(filtro.precioMinimo) }),
      ...(filtro.precioMaximo && { precioMaximo: parseFloat(filtro.precioMaximo) })
    };

    ejecutarBusqueda({ variables: { filtro: variablesFiltro } });
    setPeriodoConsultado(variablesFiltro);
  };

  const handleReservar = async (vehiculo) => {
    const clienteActual = obtenerClienteActual();
    if (!clienteActual) {
      const resultado = await Swal.fire({
        title: 'Identificate primero',
        text: 'Todavía no elegiste con qué cliente vas a reservar.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Ir a identificarme',
        cancelButtonText: 'Cancelar',
      });
      if (resultado.isConfirmed) navigate('/cliente');
      return;
    }

    const confirmacion = await Swal.fire({
      title: 'Confirmar reserva',
      html: `Vas a reservar el <b>${vehiculo.marca} ${vehiculo.modelo}</b> (patente ${vehiculo.patente})<br/>Importe total: <b>$${vehiculo.importeTotal}</b>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar reserva',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;

    setReservandoId(vehiculo.id);
    try {
      await crearReserva({
        vehiculo: vehiculo.id,
        cliente: clienteActual.id,
        fechaInicio: periodoConsultado.fechaInicio,
        fechaFinalizacion: periodoConsultado.fechaFin,
      });
      await Swal.fire('¡Reserva confirmada!', 'Ya podés verla en "Mis Reservas".', 'success');
      ejecutarBusqueda({ variables: { filtro: periodoConsultado } });
    } catch (error) {
      Swal.fire('No se pudo reservar', error.message, 'error');
    } finally {
      setReservandoId(null);
    }
  };

  const vehiculosDisponibles = data?.vehiculosDisponibles || [];

  return (
    <>
      <NavBarCliente />
      <Container className="mt-4 mb-5">
        <h2 className="mb-4">Consultar Disponibilidad de Vehículos</h2>

        {/* Formulario de Filtros */}
        <Card className="p-4 shadow-sm mb-4 bg-light">
          <Form onSubmit={handleSubmit}>
            <Row>
              <Form.Group className="col-md-6 mb-3">
                <Form.Label>Fecha y Hora de Inicio *</Form.Label>
                <Form.Control type="datetime-local" name="fechaInicio" value={filtro.fechaInicio} onChange={handleChange} required />
              </Form.Group>

              <Form.Group className="col-md-6 mb-3">
                <Form.Label>Fecha y Hora de Finalización *</Form.Label>
                <Form.Control type="datetime-local" name="fechaFin" value={filtro.fechaFin} onChange={handleChange} required />
              </Form.Group>
            </Row>

            <Row>
              <Form.Group className="col-md-4 mb-3">
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

              <Form.Group className="col-md-4 mb-3">
                <Form.Label>Marca</Form.Label>
                <Form.Control type="text" name="marca" placeholder="Ej: Toyota" value={filtro.marca} onChange={handleChange} />
              </Form.Group>

              <Form.Group className="col-md-4 mb-3">
                <Form.Label>Modelo</Form.Label>
                <Form.Control type="text" name="modelo" placeholder="Ej: Etios" value={filtro.modelo} onChange={handleChange} />
              </Form.Group>
            </Row>

            <div className="text-end">
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? 'Buscando...' : 'Buscar Disponibilidad'}
              </Button>
            </div>
          </Form>
        </Card>

        {/* Manejo de errores de GraphQL */}
        {error && <Alert variant="danger">Error al consultar disponibilidad: {error.message}</Alert>}

        {/* Resultados de la Búsqueda */}
        <h4 className="mb-3">Vehículos Encontrados</h4>
        <Table striped bordered hover responsive>
          <thead className="table-dark">
            <tr>
              <th>Patente</th>
              <th>Marca / Modelo</th>
              <th>Año</th>
              <th>Color</th>
              <th>Tipo</th>
              <th>Precio/Día</th>
              <th>Importe Total</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {vehiculosDisponibles.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center text-muted">
                  {loading ? 'Consultando el servidor...' : 'No hay vehículos disponibles para las fechas seleccionadas.'}
                </td>
              </tr>
            ) : (
              vehiculosDisponibles.map((v) => (
                <tr key={v.id}>
                  <td>{v.patente}</td>
                  <td>{v.marca} {v.modelo}</td>
                  <td>{v.anio}</td>
                  <td>{v.color || 'N/A'}</td>
                  <td>{v.tipoVehiculo}</td>
                  <td>${v.precioDiario}</td>
                  <td className="fw-bold text-success">${v.importeTotal}</td>
                  <td>
                    <Button
                      variant="success"
                      size="sm"
                      disabled={reservandoId === v.id}
                      onClick={() => handleReservar(v)}
                    >
                      {reservandoId === v.id ? 'Reservando...' : 'Reservar'}
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