import { Container, Row, Col, Card, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import NavBarCliente from "../components/NavBarCliente";
import { obtenerClienteActual } from "../utils/clienteActual";
export default function HomeCliente() {
  const navigate = useNavigate();
  const cliente = obtenerClienteActual();
  return (
    <>
      <NavBarCliente />
      <div className="bg-primary text-white py-5 mb-5 text-center shadow-sm">
        <Container>
          <h1 className="fw-bold">Hola, {cliente?.email}!</h1>
          <p className="lead">Tu próximo viaje empieza acá.</p>
          <Button
            variant="light"
            size="lg"
            onClick={() => navigate("/cliente/disponibilidad")}
          >
            Iniciar Nueva Reserva
          </Button>
        </Container>
      </div>
      <Container className="pb-5">
        <Row className="g-4">
          <Col md={4}>
            <Card className="h-100 text-center p-3">
              <Card.Body>
                <Card.Title>Buscar Vehículos</Card.Title>
                <Card.Text>Consultá disponibilidad y reservá.</Card.Text>
                <Button onClick={() => navigate("/cliente/disponibilidad")}>
                  Consultar Disponibilidad
                </Button>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="h-100 text-center p-3">
              <Card.Body>
                <Card.Title>Mis Reservas</Card.Title>
                <Card.Text>Consultá o cancelá tus próximas reservas.</Card.Text>
                <Button
                  variant="warning"
                  onClick={() => navigate("/cliente/reservas")}
                >
                  Gestionar Reservas
                </Button>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="h-100 text-center p-3">
              <Card.Body>
                <Card.Title>Historial</Card.Title>
                <Card.Text>
                  Revisá alquileres finalizados y cancelados.
                </Card.Text>
                <Button
                  variant="success"
                  onClick={() => navigate("/cliente/historial")}
                >
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
