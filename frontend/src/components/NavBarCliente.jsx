import { Link, useNavigate } from 'react-router-dom';
import { obtenerClienteActual, limpiarClienteActual } from '../utils/clienteActual';

export default function NavBarCliente() {
  const navigate = useNavigate();
  const clienteActual = obtenerClienteActual();

  const handleCambiar = () => {
    limpiarClienteActual();
    navigate('/cliente');
    window.location.reload();
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container px-lg-5">
        {/* Este Link hace que al tocar el logo se vuelva a la ruta "/cliente" (Home Cliente)*/}
        <Link className="navbar-brand" to="/cliente">Sistema Rentar</Link>

        {clienteActual && (
          <div className="d-flex align-items-center text-light small">
            <span className="me-3">
              {clienteActual.nombre} {clienteActual.apellido}
            </span>
            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              onClick={handleCambiar}
            >
              Cambiar
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
