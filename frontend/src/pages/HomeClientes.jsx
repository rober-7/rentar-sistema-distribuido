import { useState } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import NavBarCliente from '../components/NavBarCliente';
import SelectorCliente from '../components/SelectorCliente';
import { obtenerClienteActual } from '../utils/clienteActual';

export default function HomeCliente() {
  const navigate = useNavigate();
  const [clienteActual, setClienteActual] = useState(obtenerClienteActual());

  if (!clienteActual) {
    return (
      <>
        <NavBarCliente />
        <Container className="mt-5">
          <SelectorCliente onSeleccionar={setClienteActual} />
        </Container>
      </>
    );
  }

  return (
    <>
      <NavBarCliente />

      {/* Sección Hero / Bienvenida */}
      <div className="bg-primary text-white py-5 mb-5 text-center shadow-sm">
        <Container>
          <h1 className="fw-bold">Hola, {clienteActual.nombre}!</h1>
          <p className="lead">Tu próximo viaje empieza acá. Buscá, reservá y gestioná tus alquileres.</p>
          <Button 
            variant="light" 
            size="lg" 
            className="mt-3 fw-bold text-primary px-4 rounded-pill"
            onClick={() => navigate('/cliente/disponibilidad')}
          >
            Iniciar Nueva Reserva
          </Button>
        </Container>
      </div>

      <Container className="pb-5">
        <Row className="g-4">
          
          {/* Bloque 1: Nueva Reserva (Disponibilidad -> Alta) */}
          <Col md={4}>
            <Card className="h-100 shadow-sm border-0 text-center p-3 hover-effect">
              <Card.Body>
                <div className="display-4 text-primary mb-3">🚗</div>
                <Card.Title className="fw-bold">Buscar Vehículos</Card.Title>
                <Card.Text className="text-muted">
                  Consultá la disponibilidad de nuestra flota, filtrá por categorías y armá tu próxima reserva.
                </Card.Text>
                <Button variant="outline-primary" onClick={() => navigate('/cliente/disponibilidad')}>
                  Consultar Disponibilidad
                </Button>
              </Card.Body>
            </Card>
          </Col>

          {/* Bloque 2: Reservas Activas (Consulta -> Cancelar) */}
          <Col md={4}>
            <Card className="h-100 shadow-sm border-0 text-center p-3">
              <Card.Body>
                <div className="display-4 text-warning mb-3">📅</div>
                <Card.Title className="fw-bold">Mis Reservas Activas</Card.Title>
                <Card.Text className="text-muted">
                  Revisá los detalles de tus próximos viajes, consultá el estado o cancelá una reserva si lo necesitás.
                </Card.Text>
                <Button variant="outline-warning" className="text-dark" onClick={() => navigate('/cliente/reservas')}>
                  Gestionar Reservas
                </Button>
              </Card.Body>
            </Card>
          </Col>

          {/* Bloque 3: Historial (Historial GraphQL) */}
          <Col md={4}>
            <Card className="h-100 shadow-sm border-0 text-center p-3">
              <Card.Body>
                <div className="display-4 text-success mb-3">📋</div>
                <Card.Title className="fw-bold">Historial de Alquileres</Card.Title>
                <Card.Text className="text-muted">
                  Accedé al registro completo de todos tus viajes pasados, vehículos utilizados y comprobantes.
                </Card.Text>
                <Button variant="outline-success" onClick={() => navigate('/cliente/historial')}>
                  Ver Historial
                </Button>
              </Card.Body>
            </Card>
          </Col>

        </Row>
      </Container>
    </>
  );
}