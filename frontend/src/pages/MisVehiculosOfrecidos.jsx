import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Table, Button, Alert, Spinner } from "react-bootstrap";
import NavBarCliente from "../components/NavBarCliente";
import { obtenerMisVehiculosExternos } from "../services/vehiculos.service";

const ESTADO_BADGE = {
  PENDIENTE: { bg: "warning text-dark", texto: "Pendiente" },
  APROBADO: { bg: "success", texto: "Aprobado" },
  RECHAZADO: { bg: "danger", texto: "Rechazado" },
};

const VALIDACION_BADGE = {
  PENDIENTE: { bg: "warning text-dark", texto: "Pendiente" },
  VALIDADO: { bg: "success", texto: "Validado" },
  RECHAZADO: { bg: "danger", texto: "Rechazado" },
};

const badge = (tabla, valor) => {
  const { bg, texto } = tabla[valor] || { bg: "dark", texto: valor };
  return <span className={`badge bg-${bg}`}>{texto}</span>;
};

// Explica en palabras qué pasó con la solicitud.
const detalle = (v) => {
  if (v.estado === "APROBADO")
    return "Incorporado a la flota: ya está disponible para alquilar.";
  if (v.estado === "RECHAZADO") {
    const motivos = [];
    if (v.validacionPatente === "RECHAZADO")
      motivos.push("la patente tiene una denuncia de robo");
    if (v.validacionTitularidad === "RECHAZADO")
      motivos.push("no figurás como titular del vehículo");
    return `No se incorporó: ${motivos.join(" y ")}.`;
  }
  if (
    v.validacionPatente === "VALIDADO" &&
    v.validacionTitularidad === "VALIDADO"
  )
    return "Validaciones aprobadas, incorporando el vehículo...";
  return "Esperando el resultado de las validaciones...";
};

export default function MisVehiculosOfrecidos() {
  const navigate = useNavigate();
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = async () => {
    try {
      setVehiculos(await obtenerMisVehiculosExternos());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  // Las validaciones se resuelven de forma asíncrona (RabbitMQ): mientras
  // haya solicitudes pendientes se vuelve a consultar cada 2 segundos.
  const hayPendientes = vehiculos.some((v) => v.estado === "PENDIENTE");
  useEffect(() => {
    if (!hayPendientes) return;
    const intervalo = setInterval(cargar, 2000);
    return () => clearInterval(intervalo);
  }, [hayPendientes]);

  return (
    <>
      <NavBarCliente />
      <Container className="mt-4 mb-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="mb-0">Mis Vehículos Ofrecidos</h2>
          <div>
            <Button
              variant="info"
              className="text-white me-2"
              onClick={() => navigate("/cliente/publicar-vehiculo")}
            >
              Ofrecer otro vehículo
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => navigate("/cliente")}
            >
              Volver
            </Button>
          </div>
        </div>
        <p className="text-muted">
          Cada vehículo que ofrecés pasa por dos validaciones independientes:
          que la patente no tenga denuncia de robo y que seas su titular. Si
          las dos se aprueban, se incorpora a la flota de Rentar.
          {hayPendientes && (
            <span className="ms-2">
              <Spinner animation="border" size="sm" className="me-1" />
              Actualizando...
            </span>
          )}
        </p>

        {error && (
          <Alert variant="danger">
            Error al consultar tus vehículos: {error}
          </Alert>
        )}

        <Table striped bordered hover responsive className="align-middle">
          <thead className="table-dark">
            <tr>
              <th>Solicitud</th>
              <th>Vehículo</th>
              <th>Patente</th>
              <th>Precio/Día</th>
              <th>Enviada</th>
              <th>Patente sin denuncia</th>
              <th>Titularidad</th>
              <th>Estado</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {vehiculos.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center text-muted">
                  {loading
                    ? "Cargando..."
                    : "Todavía no ofreciste ningún vehículo."}
                </td>
              </tr>
            ) : (
              vehiculos.map((v) => (
                <tr
                  key={v.id}
                  className={v.estado === "RECHAZADO" ? "table-danger" : ""}
                >
                  <td>#{v.id}</td>
                  <td>
                    {v.marca} {v.modelo} {v.anio}
                  </td>
                  <td>{v.patente}</td>
                  <td>${v.precioDiario}</td>
                  <td>{new Date(v.creadoEn).toLocaleString()}</td>
                  <td>{badge(VALIDACION_BADGE, v.validacionPatente)}</td>
                  <td>{badge(VALIDACION_BADGE, v.validacionTitularidad)}</td>
                  <td>{badge(ESTADO_BADGE, v.estado)}</td>
                  <td className="small">{detalle(v)}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Container>
    </>
  );
}
