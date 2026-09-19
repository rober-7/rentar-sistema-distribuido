import { useEffect, useState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import { obtenerClientes } from '../services/clientes.service';
import { guardarClienteActual } from '../utils/clienteActual';

export default function SelectorCliente({ onSeleccionar }) {
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerClientes()
      .then((datos) => setClientes(datos.filter((c) => c.activo)))
      .finally(() => setCargando(false));
  }, []);

  const handleConfirmar = () => {
    const cliente = clientes.find((c) => String(c.id) === clienteId);
    if (!cliente) return;

    const clienteActual = {
      id: cliente.id,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      documento: cliente.documento,
    };
    guardarClienteActual(clienteActual);
    onSeleccionar(clienteActual);
  };

  return (
    <div className="p-4 bg-light rounded-3 border">
      <h5 className="mb-2">¿Quién sos?</h5>
      <p className="text-muted small mb-3">
        Todavía no hay inicio de sesión: elegí tu registro de cliente para poder
        reservar, ver tus reservas y tu historial.
      </p>

      {cargando ? (
        <p className="text-muted small mb-0">Cargando clientes...</p>
      ) : clientes.length === 0 ? (
        <Alert variant="warning" className="mb-0">
          No hay clientes activos registrados. Pedile a un administrador que te dé de alta primero.
        </Alert>
      ) : (
        <div className="d-flex gap-2 flex-wrap align-items-center">
          <Form.Select
            style={{ maxWidth: 320 }}
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            <option value="">Seleccioná tu nombre...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.apellido} (Doc. {c.documento})
              </option>
            ))}
          </Form.Select>
          <Button variant="primary" disabled={!clienteId} onClick={handleConfirmar}>
            Continuar
          </Button>
        </div>
      )}
    </div>
  );
}
