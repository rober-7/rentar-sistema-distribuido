import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomeAdm from './pages/homeAdm';
import GestionVehiculos from './pages/GestionVehiculos';
import GestionClientes from './pages/GestionClientes';
import GestionReservas from './pages/GestionReservas';
import HomeCliente from './pages/HomeClientes';
import ConsultarDisponibilidad from './pages/ConsultarDisponibilidad';
import MisReservas from './pages/MisReservas';
import HistorialAlquileres from './pages/HistorialAlquileres';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta Home del Administrador */}
        <Route path="/" element={<HomeAdm />} />
        <Route path="/vehiculos" element={<GestionVehiculos />} />
        <Route path="/clientes" element={<GestionClientes />} />
        <Route path="/reservas" element={<GestionReservas />} />

        {/*Ruta Home del Cliente */}
        <Route path="/cliente" element={<HomeCliente />} />
        <Route path="/cliente/disponibilidad" element={<ConsultarDisponibilidad />} />
        <Route path="/cliente/reservas" element={<MisReservas />} />
        <Route path="/cliente/historial" element={<HistorialAlquileres />} />
      </Routes>
    </BrowserRouter>
  );
}