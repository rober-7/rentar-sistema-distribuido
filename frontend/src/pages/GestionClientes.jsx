import { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form } from 'react-bootstrap';
import { obtenerClientes, crearCliente, bajaCliente, modificarCliente } from '../services/clientes.service';
import NavBar from '../components/NavBar';
import Swal from 'sweetalert2';

const FORM_INICIAL = {
  documento: '',
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  fechaNacimiento: '',
  activo: true,
};

export default function GestionClientes() {
  const [clientes, setClientes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(FORM_INICIAL);

  const cargarClientes = async () => {
    try {
      const datos = await obtenerClientes();
      const datosOrdenados = datos.sort((a, b) => {
        if (a.activo === b.activo) return 0;
        return a.activo ? -1 : 1;
      });
      setClientes(datosOrdenados);
    } catch (error) {
      console.error('Error al cargar la tabla:', error);
      setClientes([]);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleAbrirAlta = () => {
    setEditId(null);
    setFormData(FORM_INICIAL);
    setShowModal(true);
  };

  const handleAbrirEdicion = (cliente) => {
    setEditId(cliente.id);
    setFormData({
      documento: cliente.documento,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      email: cliente.email,
      telefono: cliente.telefono || '',
      fechaNacimiento: cliente.fechaNacimiento,
      activo: cliente.activo,
    });
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditId(null);
  };

  const handleGuardar = async () => {
    try {
      const clienteFormateado = {
        ...formData,
        telefono: formData.telefono.trim() === '' ? undefined : formData.telefono,
      };

      if (editId) {
        // El documento no se puede modificar una vez creado el cliente
        delete clienteFormateado.documento;
        await modificarCliente(editId, clienteFormateado);
        Swal.fire({
          title: '¡Actualizado!',
          text: 'El cliente se modificó correctamente.',
          icon: 'success',
          confirmButtonColor: '#0d6efd',
        });
      } else {
        await crearCliente(clienteFormateado);
        Swal.fire({
          title: '¡Guardado!',
          text: 'El nuevo cliente se registró correctamente.',
          icon: 'success',
          confirmButtonColor: '#0d6efd',
        });
      }

      await cargarClientes();
      handleClose();
    } catch (error) {
      Swal.fire({
        title: 'No se pudo guardar',
        text: error.message,
        icon: 'error',
        confirmButtonColor: '#dc3545',
      });
    }
  };

  const handleBaja = async (id, nombreCompleto) => {
    const confirmacion = await Swal.fire({
      title: '¿Dar de baja?',
      text: `Estás por dar de baja al cliente ${nombreCompleto}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, dar de baja',
      cancelButtonText: 'Cancelar',
    });

    if (confirmacion.isConfirmed) {
      try {
        await bajaCliente(id);
        Swal.fire({
          title: '¡Baja exitosa!',
          text: 'El cliente fue desactivado del sistema.',
          icon: 'success',
          confirmButtonColor: '#0d6efd',
        });
        await cargarClientes();
      } catch (error) {
        Swal.fire({
          title: 'Error',
          text: error.message,
          icon: 'error',
          confirmButtonColor: '#dc3545',
        });
      }
    }
  };

  return (
    <>
      <NavBar />

      <Container className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>Gestión de Clientes</h2>
          <Button variant="primary" onClick={handleAbrirAlta}>+ Nuevo Cliente</Button>
        </div>

        <Table striped bordered hover responsive>
          <thead className="table-dark">
            <tr>
              <th>Documento</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Fecha Nac.</th>
              <th>Activo?</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center">No hay clientes registrados...</td>
              </tr>
            ) : (
              clientes.map((c) => (
                <tr key={c.id} className={!c.activo ? 'table-secondary text-muted' : ''}>
                  <td>{c.documento}</td>
                  <td>{c.nombre}</td>
                  <td>{c.apellido}</td>
                  <td>{c.email}</td>
                  <td>{c.telefono || 'N/A'}</td>
                  <td>{c.fechaNacimiento}</td>
                  <td>
                    {c.activo ? (
                      <span className="badge bg-success">Sí</span>
                    ) : (
                      <span className="badge bg-secondary">No</span>
                    )}
                  </td>
                  <td>
                    <Button variant="warning" size="sm" className="me-2" onClick={() => handleAbrirEdicion(c)}>
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleBaja(c.id, `${c.nombre} ${c.apellido}`)}
                      disabled={!c.activo}
                    >
                      Baja
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>

        <Modal show={showModal} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>{editId ? 'Editar Cliente' : 'Alta de Nuevo Cliente'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <div className="row">
                <Form.Group className="col-md-6 mb-3">
                  <Form.Label>Documento *</Form.Label>
                  <Form.Control type="text" name="documento" value={formData.documento} onChange={handleChange} placeholder="Ej: 30123456" disabled={editId !== null} />
                </Form.Group>

                <Form.Group className="col-md-6 mb-3">
                  <Form.Label>Fecha de Nacimiento *</Form.Label>
                  <Form.Control type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} />
                </Form.Group>
              </div>

              <div className="row">
                <Form.Group className="col-md-6 mb-3">
                  <Form.Label>Nombre *</Form.Label>
                  <Form.Control type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Ej: Juan" />
                </Form.Group>

                <Form.Group className="col-md-6 mb-3">
                  <Form.Label>Apellido *</Form.Label>
                  <Form.Control type="text" name="apellido" value={formData.apellido} onChange={handleChange} placeholder="Ej: Pérez" />
                </Form.Group>
              </div>

              <div className="row">
                <Form.Group className="col-md-6 mb-3">
                  <Form.Label>Email *</Form.Label>
                  <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Ej: juan@example.com" />
                </Form.Group>

                <Form.Group className="col-md-6 mb-3">
                  <Form.Label>Teléfono</Form.Label>
                  <Form.Control type="text" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="Ej: 1112345678" />
                </Form.Group>
              </div>

              {editId !== null && (
                <div className="row mt-3 pt-3 border-top">
                  <Form.Group className="col-12">
                    <Form.Check
                      type="switch"
                      id="activo-switch"
                      name="activo"
                      checked={formData.activo}
                      onChange={handleChange}
                      label={
                        formData.activo
                          ? 'Cliente Activo (Puede alquilar)'
                          : 'Cliente Inactivo (Dado de baja)'
                      }
                      className={formData.activo ? 'text-success fw-bold' : 'text-danger fw-bold'}
                    />
                  </Form.Group>
                </div>
              )}
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button variant="primary" onClick={handleGuardar}>Guardar Cliente</Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
}
