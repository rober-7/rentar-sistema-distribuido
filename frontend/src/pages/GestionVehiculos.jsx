import { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form } from 'react-bootstrap';
import { obtenerVehiculos, crearVehiculo, bajaVehiculo, modificarVehiculo } from '../services/vehiculos.service';
import NavBar from '../components/NavBar';
import Swal from 'sweetalert2';

export default function GestionVehiculos() {
  const [vehiculos, setVehiculos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    patente: '',
    marca: '',
    modelo: '',
    anio: '',
    color: '',
    tipoVehiculo: 'SEDAN',
    precioDiario: '',
    activo: true
  });

  const cargarVehiculos = async () => {
    try {
      const datos = await obtenerVehiculos();

      // Ordenamos el array antes de guardarlo
      const datosOrdenados = datos.sort((a, b) => {
        // Si tienen el mismo estado, no cambiamos su orden
        if (a.activo === b.activo) return 0;
        // Si 'a' es activo (true), lo mandamos para arriba (-1)
        // Si 'a' es inactivo (false), lo mandamos para abajo (1)
        return a.activo ? -1 : 1;
      });

      setVehiculos(datosOrdenados);
    } catch (error) {
      console.error("Error al cargar la tabla:", error);
      setVehiculos([]);
    }
  };

  useEffect(() => {
    cargarVehiculos();
  }, []);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    const valorFinal = name === 'patente' ? value.toUpperCase() : value;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : valorFinal
    });
  };

  const handleAbrirAlta = () => {
    setEditId(null);
    setFormData({ patente: '', marca: '', modelo: '', anio: '', color: '', tipoVehiculo: 'SEDAN', precioDiario: '' });
    setShowModal(true);
  };

  const handleAbrirEdicion = (vehiculo) => {
    setEditId(vehiculo.id);
    setFormData({
      patente: vehiculo.patente,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio,
      color: vehiculo.color || '',
      tipoVehiculo: vehiculo.tipoVehiculo || 'SEDAN',
      precioDiario: vehiculo.precioDiario || '',
      activo: vehiculo.activo
    });
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditId(null);
  };

  const handleGuardar = async () => {
    try {
      const vehiculoFormateado = {
        ...formData,
        anio: parseInt(formData.anio),
        precioDiario: parseFloat(formData.precioDiario),
        color: formData.color.trim() === '' ? null : formData.color
      };

      if (editId) {
        await modificarVehiculo(editId, vehiculoFormateado);
        Swal.fire({
          title: '¡Actualizado!',
          text: 'El vehículo se modificó correctamente.',
          icon: 'success',
          confirmButtonColor: '#0d6efd'
        });
      } else {
        await crearVehiculo(vehiculoFormateado);
        Swal.fire({
          title: '¡Guardado!',
          text: 'El nuevo vehículo se registró correctamente.',
          icon: 'success',
          confirmButtonColor: '#0d6efd'
        });
      }

      await cargarVehiculos();
      handleClose();
    } catch (error) {
      Swal.fire({
        title: 'No se pudo guardar',
        text: error.message,
        icon: 'error',
        confirmButtonColor: '#dc3545'
      });
    }
  };

  const handleBaja = async (id, patente) => {
    const confirmacion = await Swal.fire({
      title: '¿Dar de baja?',
      text: `Estás por dar de baja el vehículo patente ${patente}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, dar de baja',
      cancelButtonText: 'Cancelar'
    });

    if (confirmacion.isConfirmed) {
      try {
        await bajaVehiculo(id);
        Swal.fire({
          title: '¡Baja exitosa!',
          text: 'El vehículo fue desactivado del sistema.',
          icon: 'success',
          confirmButtonColor: '#0d6efd'
        });
        await cargarVehiculos();
      } catch (error) {
        Swal.fire({
          title: 'Error',
          text: 'Hubo un problema al dar de baja.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    }
  };

  return (
    <>
      <NavBar />

      <Container className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>Gestión de Vehículos</h2>
          <Button variant="primary" onClick={handleAbrirAlta}>+ Nuevo Vehículo</Button>
        </div>

        <Table striped bordered hover responsive>
          <thead className="table-dark">
            <tr>
              <th>Patente</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Año</th>
              <th>Color</th>
              <th>Tipo</th>
              <th>Precio/Día</th>
              <th>Estado</th>
              <th>Activo?</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {vehiculos.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center">No hay vehículos registrados...</td>
              </tr>
            ) : (
              vehiculos.map((v) => (
                <tr key={v.id} className={!v.activo ? 'table-secondary text-muted' : ''}>
                  <td>{v.patente}</td>
                  <td>{v.marca}</td>
                  <td>{v.modelo}</td>
                  <td>{v.anio}</td>
                  <td>{v.color ? v.color : 'N/A'}</td>
                  <td>{v.tipoVehiculo}</td>
                  <td>${v.precioDiario}</td>
                  <td>{v.estado}</td>
                  <td>
                    {v.activo ? (
                      <span className="badge bg-success">Sí</span>
                    ) : (
                      <span className="badge bg-secondary">No</span>
                    )}
                  </td>
                  <td>
                    <Button variant="warning" size="sm" className="me-2" onClick={() => handleAbrirEdicion(v)}>
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleBaja(v.id, v.patente)}
                      disabled={!v.activo}
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
            <Modal.Title>{editId ? 'Editar Vehículo' : 'Alta de Nuevo Vehículo'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <div className="row">
                <Form.Group className="col-md-6 mb-3">
                  <Form.Label>Patente *</Form.Label>
                  <Form.Control type="text" name="patente" value={formData.patente} onChange={handleChange} placeholder="Ej: AB123CD" disabled={editId !== null} />
                </Form.Group>

                <Form.Group className="col-md-6 mb-3">
                  <Form.Label>Tipo de Vehículo</Form.Label>
                  <Form.Select name="tipoVehiculo" value={formData.tipoVehiculo} onChange={handleChange}>
                    <option value="SEDAN">Sedán</option>
                    <option value="SUV">SUV</option>
                    <option value="PICKUP">Pick-Up</option>
                    <option value="COUPE">Coupé</option>
                    <option value="HATCHBACK">Hatchback</option>
                  </Form.Select>
                </Form.Group>
              </div>

              <div className="row">
                <Form.Group className="col-md-6 mb-3">
                  <Form.Label>Marca *</Form.Label>
                  <Form.Control type="text" name="marca" value={formData.marca} onChange={handleChange} placeholder="Ej: Ford" />
                </Form.Group>

                <Form.Group className="col-md-6 mb-3">
                  <Form.Label>Modelo *</Form.Label>
                  <Form.Control type="text" name="modelo" value={formData.modelo} onChange={handleChange} placeholder="Ej: Focus" />
                </Form.Group>
              </div>

              <div className="row">
                <Form.Group className="col-md-4 mb-3">
                  <Form.Label>Año *</Form.Label>
                  <Form.Control type="number" name="anio" value={formData.anio} onChange={handleChange} placeholder="Ej: 2024" />
                </Form.Group>

                <Form.Group className="col-md-4 mb-3">
                  <Form.Label>Color</Form.Label>
                  <Form.Control type="text" name="color" value={formData.color} onChange={handleChange} placeholder="Ej: Blanco" />
                </Form.Group>

                <Form.Group className="col-md-4 mb-3">
                  <Form.Label>Precio Diario *</Form.Label>
                  <Form.Control type="number" name="precioDiario" value={formData.precioDiario} onChange={handleChange} placeholder="Ej: 15000" />
                </Form.Group>
              </div>
              {/* SECCIÓN DE REACTIVACIÓN (Solo visible en edición) */}
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
                          ? "Vehículo Operativo (Visible para alquilar)"
                          : "Vehículo Inactivo (Dado de baja)"
                      }
                      className={formData.activo ? "text-success fw-bold" : "text-danger fw-bold"}
                    />
                  </Form.Group>
                </div>
              )}
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button variant="primary" onClick={handleGuardar}>Guardar Vehículo</Button>
          </Modal.Footer>
        </Modal>

      </Container>
    </>
  );
}