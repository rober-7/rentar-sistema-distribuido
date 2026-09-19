import { Link } from 'react-router-dom';

export default function NavBar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container px-lg-5">
        {/* Este Link hace que al tocar el logo se vuelva a la ruta "/" (HomeAdm) */}
        <Link className="navbar-brand" to="/">Sistema Rentar</Link>
      </div>
    </nav>
  );
}