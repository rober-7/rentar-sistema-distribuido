import { Navigate } from "react-router-dom";
import { usuarioActual } from "../utils/auth";
export default function ProtectedRoute({ roles, children }) {
  const user = usuarioActual();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.rol))
    return <Navigate to={user.rol === "ADMIN" ? "/" : "/cliente"} replace />;
  return children;
}
