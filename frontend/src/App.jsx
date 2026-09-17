import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/home';
import GestionVehiculos from './pages/GestionVehiculos';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/vehiculos" element={<GestionVehiculos />} />
      </Routes>
    </BrowserRouter>
  );
}