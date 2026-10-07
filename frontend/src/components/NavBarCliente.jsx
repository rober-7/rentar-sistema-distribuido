import { Link, useNavigate } from "react-router-dom";
import { usuarioActual, cerrarSesion } from "../utils/auth";
import { logout } from "../services/auth.service";
export default function NavBarCliente() {
  const go = useNavigate();
  const user = usuarioActual();
  const salir = async () => {
    await logout();
    cerrarSesion();
    go("/login");
  };
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container px-lg-5">
        <Link className="navbar-brand" to="/cliente">
          Sistema Rentar
        </Link>
        {user && (
          <div className="d-flex align-items-center text-light small">
            <span className="me-3">{user.email}</span>
            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              onClick={salir}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
