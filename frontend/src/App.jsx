import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomeAdm from './pages/homeAdm';
import GestionVehiculos from './pages/GestionVehiculos';
import HomeCliente from './pages/HomeClientes';
import ConsultarDisponibilidad from './pages/ConsultarDisponibilidad';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta Home del Administrador */}
        <Route path="/" element={<HomeAdm />} />
        <Route path="/vehiculos" element={<GestionVehiculos />} />

        {/*Ruta Home del Cliente */}
        <Route path="/cliente" element={<HomeCliente />} />
        <Route path="/cliente/disponibilidad" element={<ConsultarDisponibilidad />} />
      </Routes>
    </BrowserRouter>
  );
}