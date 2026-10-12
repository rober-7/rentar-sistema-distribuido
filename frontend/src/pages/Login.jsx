import { useState } from "react";
import { Alert, Button, Card, Container, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { login } from "../services/auth.service";
import { guardarSesion } from "../utils/auth";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const go = useNavigate();
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const s = await login(email, password);
      guardarSesion(s);
      go(s.usuario.rol === "ADMIN" ? "/" : "/cliente", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Container className="py-5" style={{ maxWidth: 440 }}>
      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <h1 className="h3 mb-3">Ingresar a Rentar</h1>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={submit}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Contraseña</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>
            <Button type="submit" className="w-100" disabled={loading}>
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
