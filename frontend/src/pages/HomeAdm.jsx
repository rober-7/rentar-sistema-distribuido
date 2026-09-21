import { Link } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import NavBar from '../components/NavBar';

export default function HomeAdm() {
  return (
    <div>
      {/* Barra de navegación */}
      <NavBar />

      {/* ENCABEZADO*/}
      <header className="py-5">
        <Container className="px-lg-5">
          <div className="p-4 p-lg-5 bg-light rounded-3 text-center">
            <div className="m-4 m-lg-5">
              <h1 className="display-5 fw-bold">¡Bienvenido a Rentar!</h1>
              <p className="fs-4">
                Panel de administración central. Desde aquí podés gestionar toda la flota de vehículos, 
                los clientes registrados y las reservas activas.
              </p>
            </div>
          </div>
        </Container>
      </header>

      {/* SECCIÓN DE TARJETAS */}
      <section className="pt-4">
        <Container className="px-lg-5">
          <div className="row gx-lg-5 justify-content-center">
            
            {/* TARJETA 1: Vehículos */}
            <div className="col-lg-4 col-xxl-4 mb-5">
              <div className="card bg-light border-0 h-100">
                <div className="card-body text-center p-4 p-lg-5 pt-0 pt-lg-0">
                  <div className="feature bg-primary bg-gradient text-white rounded-3 mb-4 mt-n4">
                    🚗
                  </div>
                  <h2 className="fs-4 fw-bold">Vehículos</h2>
                  <p className="mb-4">Alta, baja y modificación de la flota de alquiler.</p>
                  <Link to="/vehiculos" className="btn btn-primary">Gestionar Vehículos</Link>
                </div>
              </div>
            </div>

            {/* TARJETA 2: Clientes */}
            <div className="col-lg-4 col-xxl-4 mb-5">
              <div className="card bg-light border-0 h-100">
                <div className="card-body text-center p-4 p-lg-5 pt-0 pt-lg-0">
                  <div className="feature bg-primary bg-gradient text-white rounded-3 mb-4 mt-n4">
                    👥
                  </div>
                  <h2 className="fs-4 fw-bold">Clientes</h2>
                  <p className="mb-4">Administración del padrón de clientes registrados.</p>
                  <Link to="/clientes" className="btn btn-primary">Gestionar Clientes</Link>
                </div>
              </div>
            </div>

            {/* TARJETA 3: Reservas */}
            <div className="col-lg-4 col-xxl-4 mb-5">
              <div className="card bg-light border-0 h-100">
                <div className="card-body text-center p-4 p-lg-5 pt-0 pt-lg-0">
                  <div className="feature bg-primary bg-gradient text-white rounded-3 mb-4 mt-n4">
                    📅
                  </div>
                  <h2 className="fs-4 fw-bold">Reservas</h2>
                  <p className="mb-4">Consulta de disponibilidad y asignación de alquileres.</p>
                  <Link to="/reservas" className="btn btn-primary">Gestionar Reservas</Link>
                </div>
              </div>
            </div>

          </div>
        </Container>
      </section>
    </div>
  );
}