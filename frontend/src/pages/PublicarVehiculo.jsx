import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Badge,
} from "react-bootstrap";
import NavBarCliente from "../components/NavBarCliente";
import { registrarVehiculoExterno } from "../services/vehiculos.service";

const ESTADO_INICIAL = {
  patente: "",
  marca: "",
  modelo: "",
  anio: "",
  color: "",
  tipoVehiculo: "SEDAN",
  precioDiario: "",
};

export default function PublicarVehiculo() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(ESTADO_INICIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "patente" ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      const payload = {
        patente: formData.patente.trim(),
        marca: formData.marca.trim(),
        modelo: formData.modelo.trim(),
        anio: parseInt(formData.anio, 10),
        tipoVehiculo: formData.tipoVehiculo,
        precioDiario: parseFloat(formData.precioDiario),
        ...(formData.color.trim() !== ""
          ? { color: formData.color.trim() }
          : {}),
      };

      const creado = await registrarVehiculoExterno(payload);
      setResultado(creado);
      setFormData(ESTADO_INICIAL);
    } catch (err) {
      setError(err.message || "No se pudo registrar el vehículo externo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NavBarCliente />
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={8} lg={7}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 className="fw-bold mb-1">Ofrecer mi Vehículo</h2>
                <p className="text-muted mb-0">
                  Registrá tu vehículo para incorporarlo a la flota de alquiler
                  de Rentar.
                </p>
              </div>
              <Button
                variant="outline-secondary"
                onClick={() => navigate("/cliente")}
              >
                Volver
              </Button>
            </div>

            {resultado && (
              <Alert
                variant="success"
                dismissible
                onClose={() => setResultado(null)}
                className="shadow-sm"
              >
                <Alert.Heading className="h5 d-flex align-items-center justify-content-between">
                  <span>¡Vehículo registrado con éxito!</span>
                  <Badge bg="warning" text="dark">
                    Pendiente de validación
                  </Badge>
                </Alert.Heading>
                <p className="mb-1">
                  La solicitud{" "}
                  <strong>#{resultado.id}</strong> para el vehículo{" "}
                  <strong>
                    {resultado.marca} {resultado.modelo} ({resultado.patente})
                  </strong>{" "}
                  quedó en estado <strong>Pendiente de validación</strong>.
                </p>
                <small className="text-muted d-block mb-2">
                  Ahora se validan en segundo plano la patente y la
                  titularidad. Si las dos se aprueban, tu vehículo pasará
                  automáticamente a estado <strong>DISPONIBLE</strong>.
                </small>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => navigate("/cliente/mis-vehiculos")}
                >
                  Seguir el resultado
                </Button>
              </Alert>
            )}

            {error && (
              <Alert
                variant="danger"
                dismissible
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}

            <Card className="shadow-sm">
              <Card.Body className="p-4">
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Form.Group className="col-md-6 mb-3" controlId="patente">
                      <Form.Label>Patente *</Form.Label>
                      <Form.Control
                        type="text"
                        name="patente"
                        value={formData.patente}
                        onChange={handleChange}
                        placeholder="Ej: AD123EX"
                        required
                        disabled={loading}
                      />
                    </Form.Group>

                    <Form.Group
                      className="col-md-6 mb-3"
                      controlId="tipoVehiculo"
                    >
                      <Form.Label>Tipo de Vehículo *</Form.Label>
                      <Form.Select
                        name="tipoVehiculo"
                        value={formData.tipoVehiculo}
                        onChange={handleChange}
                        disabled={loading}
                      >
                        <option value="SEDAN">Sedán</option>
                        <option value="SUV">SUV</option>
                        <option value="PICKUP">Pick-Up</option>
                        <option value="COUPE">Coupé</option>
                        <option value="HATCHBACK">Hatchback</option>
                      </Form.Select>
                    </Form.Group>
                  </Row>

                  <Row>
                    <Form.Group className="col-md-6 mb-3" controlId="marca">
                      <Form.Label>Marca *</Form.Label>
                      <Form.Control
                        type="text"
                        name="marca"
                        value={formData.marca}
                        onChange={handleChange}
                        placeholder="Ej: Toyota"
                        required
                        disabled={loading}
                      />
                    </Form.Group>

                    <Form.Group className="col-md-6 mb-3" controlId="modelo">
                      <Form.Label>Modelo *</Form.Label>
                      <Form.Control
                        type="text"
                        name="modelo"
                        value={formData.modelo}
                        onChange={handleChange}
                        placeholder="Ej: Corolla"
                        required
                        disabled={loading}
                      />
                    </Form.Group>
                  </Row>

                  <Row>
                    <Form.Group className="col-md-4 mb-3" controlId="anio">
                      <Form.Label>Año *</Form.Label>
                      <Form.Control
                        type="number"
                        name="anio"
                        value={formData.anio}
                        onChange={handleChange}
                        placeholder="Ej: 2023"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        required
                        disabled={loading}
                      />
                    </Form.Group>

                    <Form.Group className="col-md-4 mb-3" controlId="color">
                      <Form.Label>Color</Form.Label>
                      <Form.Control
                        type="text"
                        name="color"
                        value={formData.color}
                        onChange={handleChange}
                        placeholder="Ej: Blanco"
                        disabled={loading}
                      />
                    </Form.Group>

                    <Form.Group
                      className="col-md-4 mb-3"
                      controlId="precioDiario"
                    >
                      <Form.Label>Precio Diario ($) *</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="1"
                        name="precioDiario"
                        value={formData.precioDiario}
                        onChange={handleChange}
                        placeholder="Ej: 28000"
                        required
                        disabled={loading}
                      />
                    </Form.Group>
                  </Row>

                  <div className="d-grid mt-3">
                    <Button
                      variant="primary"
                      size="lg"
                      type="submit"
                      disabled={loading}
                    >
                      {loading
                        ? "Registrando vehículo..."
                        : "Publicar Vehículo"}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}

