import { Link } from 'react-router-dom';

export default function NavBarCliente() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container px-lg-5">
        {/* Este Link hace que al tocar el logo se vuelva a la ruta "/cliente" (Home Cliente)*/}
        <Link className="navbar-brand" to="/cliente">Sistema Rentar</Link>
      </div>
    </nav>
  );
}