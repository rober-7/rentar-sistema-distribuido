import { useState, useEffect } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import Swal from "sweetalert2";
import { registrarDevolucion } from "../services/reservas.service";

const OPCIONES_ESTADO_GENERAL = [
  { value: "EXCELENTE", label: "Excelente (sin detalles)" },
  { value: "BUENO", label: "Bueno (desgaste normal)" },
  { value: "DANIO_LEVE", label: "Daño leve (rayón o detalle menor)" },
  { value: "DANIO_GRAVE", label: "Daño grave (siniestro o avería mecánica)" },
];

export default function ModalDevolucion({ show, reserva, onHide, onSuccess }) {
  const [kilometrajeFinal, setKilometrajeFinal] = useState("");
  const [estadoGeneral, setEstadoGeneral] = useState("EXCELENTE");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show) {
      setKilometrajeFinal("");
      setEstadoGeneral("EXCELENTE");
      setError(null);
    }
  }, [show, reserva]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reserva) return;

    const kmNumero = parseInt(kilometrajeFinal, 10);
    if (Number.isNaN(kmNumero) || kmNumero < 0) {
      setError("Ingresá un kilometraje válido (0 o superior).");
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      const resultado = await registrarDevolucion({
        reservaId: reserva.id,
        kilometrajeFinal: kmNumero,
        estadoGeneral,
      });
      onHide();
      await Swal.fire({
        title: "¡Devolución registrada!",
        text: resultado.mensaje,
        icon: "success",
        confirmButtonColor: "#0d6efd",
      });
      if (onSuccess) onSuccess(resultado);
    } catch (err) {
      setError(err.message || "No se pudo registrar la devolución.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal show={show} onHide={enviando ? undefined : onHide} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton={!enviando}>
          <Modal.Title>Registrar Devolución de Vehículo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {reserva && (
            <div className="mb-3 p-3 bg-light rounded border">
              <div>
                <strong>Reserva:</strong> #{reserva.id}
              </div>
              <div>
                <strong>Vehículo:</strong> {reserva.vehiculo} ({reserva.patente})
              </div>
              {reserva.cliente && (
                <div>
                  <strong>Cliente:</strong> {reserva.cliente}
                </div>
              )}
            </div>
          )}

          {error && <Alert variant="danger">{error}</Alert>}

          <Form.Group className="mb-3">
            <Form.Label>Kilometraje actual del vehículo *</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="1"
              required
              placeholder="Ej: 1200"
              value={kilometrajeFinal}
              onChange={(e) => setKilometrajeFinal(e.target.value)}
              disabled={enviando}
            />
            <Form.Text className="text-muted">
              El exceso sobre el tope incluido se liquidará automáticamente en
              el comprobante final.
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Estado general de entrega *</Form.Label>
            <Form.Select
              value={estadoGeneral}
              onChange={(e) => setEstadoGeneral(e.target.value)}
              disabled={enviando}
            >
              {OPCIONES_ESTADO_GENERAL.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={enviando}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={enviando}>
            {enviando ? "Registrando..." : "Confirmar Devolución"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
