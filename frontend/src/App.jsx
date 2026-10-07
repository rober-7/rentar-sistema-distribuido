import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomeAdm from "./pages/homeAdm";
import GestionVehiculos from "./pages/GestionVehiculos";
import GestionClientes from "./pages/GestionClientes";
import GestionReservas from "./pages/GestionReservas";
import HomeCliente from "./pages/HomeClientes";
import ConsultarDisponibilidad from "./pages/ConsultarDisponibilidad";
import MisReservas from "./pages/MisReservas";
import HistorialAlquileres from "./pages/HistorialAlquileres";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
const admin = (x) => <ProtectedRoute roles={["ADMIN"]}>{x}</ProtectedRoute>,
  cliente = (x) => <ProtectedRoute roles={["CLIENTE"]}>{x}</ProtectedRoute>;
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={admin(<HomeAdm />)} />
        <Route path="/vehiculos" element={admin(<GestionVehiculos />)} />
        <Route path="/clientes" element={admin(<GestionClientes />)} />
        <Route path="/reservas" element={admin(<GestionReservas />)} />
        <Route path="/cliente" element={cliente(<HomeCliente />)} />
        <Route
          path="/cliente/disponibilidad"
          element={cliente(<ConsultarDisponibilidad />)}
        />
        <Route path="/cliente/reservas" element={cliente(<MisReservas />)} />
        <Route
          path="/cliente/historial"
          element={cliente(<HistorialAlquileres />)}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
