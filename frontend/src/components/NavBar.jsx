import { Link, useNavigate } from "react-router-dom";
import { cerrarSesion, usuarioActual } from "../utils/auth";
import { logout } from "../services/auth.service";
export default function NavBar() {
  const go = useNavigate();
  const salir = async () => {
    await logout();
    cerrarSesion();
    go("/login");
  };
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container px-lg-5">
        <Link className="navbar-brand" to="/">
          Sistema Rentar
        </Link>
        <div className="text-light small">
          {usuarioActual()?.email}
          <button className="btn btn-outline-light btn-sm ms-3" onClick={salir}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </nav>
  );
}
