"""Customer Service - microservicio gRPC de clientes (Hito 2, Rentar).

Implementa las 4 operaciones del contrato (ListarClientes, ObtenerCliente,
VerificarExistencia, VerificarActivo) leyendo directamente la base de 
datos Postgres compartida (tabla "clientes").
"""

import os
import sys
from concurrent import futures

import grpc
from grpc_tools import protoc
from sqlalchemy import create_engine, text

import bcrypt

PROTO_DIR = os.path.join(os.path.dirname(__file__), "proto")
GENERATED_DIR = os.path.join(os.path.dirname(__file__), "generated")

def compilar_proto() -> None:
    """Compila el archivo .proto dinámicamente al arrancar el servidor."""
    os.makedirs(GENERATED_DIR, exist_ok=True)
    open(os.path.join(GENERATED_DIR, "__init__.py"), "a").close()
    codigo = protoc.main(
        [
            "grpc_tools.protoc",
            f"-I{PROTO_DIR}",
            f"--python_out={GENERATED_DIR}",
            f"--grpc_python_out={GENERATED_DIR}",
            os.path.join(PROTO_DIR, "clientes.proto"),
        ]
    )
    if codigo != 0:
        raise RuntimeError("Fallo compilando clientes.proto")

# Ejecutamos la compilación antes de importar los módulos generados
compilar_proto()
sys.path.insert(0, GENERATED_DIR)

import clientes_pb2 as pb  # noqa: E402
import clientes_pb2_grpc as pb_grpc  # noqa: E402

def engine_desde_env():
    """Crea la conexión a la base de datos usando las variables de entorno de Docker."""
    host = os.environ["DB_HOST"]
    port = os.environ.get("DB_PORT", "5432")
    user = os.environ["DB_USER"]
    password = os.environ["DB_PASSWORD"]
    name = os.environ["DB_NAME"]
    url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"
    return create_engine(url, pool_pre_ping=True)

def _fila_a_pb(c) -> pb.Cliente:
    """Mapea una fila SQL (diccionario) al mensaje gRPC Cliente."""
    cliente_pb = pb.Cliente()
    cliente_pb.id = c["id"]
    cliente_pb.documento = c["documento"]
    cliente_pb.nombre = c["nombre"]
    cliente_pb.apellido = c["apellido"]
    cliente_pb.email = c["email"]
    
    if c["telefono"] is not None:
        cliente_pb.telefono = c["telefono"]
        
    # Convertimos la fecha a string isoformat si existe
    if c["fechaNacimiento"]:
        # Dependiendo del tipo de dato en la BD (Date o String), lo formateamos
        cliente_pb.fecha_nacimiento = str(c["fechaNacimiento"])
        
    cliente_pb.activo = c["activo"]
    return cliente_pb

class ClienteServiceServicer(pb_grpc.ClienteServiceServicer):
    def __init__(self, engine):
        self.engine = engine

    def ListarClientes(self, request, context):
        print("[gRPC] ListarClientes invocado por el Gateway", flush=True)
        with self.engine.connect() as conn:
            clientes = conn.execute(
                text(
                    """
                    SELECT id, documento, nombre, apellido, email, 
                           telefono, "fechaNacimiento", activo
                    FROM usuarios
                    WHERE rol = 'CLIENTE'
                    ORDER BY id ASC
                    """
                )
            ).mappings().all()

        respuesta = pb.ListarClientesResponse()
        for c in clientes:
            respuesta.clientes.append(_fila_a_pb(c))
        return respuesta

    def ObtenerCliente(self, request, context):
        print(f"[gRPC] ObtenerCliente({request.id}) invocado por el Gateway", flush=True)
        with self.engine.connect() as conn:
            c = conn.execute(
                text(
                    """
                    SELECT id, documento, nombre, apellido, email, 
                           telefono, "fechaNacimiento", activo
                    FROM usuarios
                    WHERE id = :id
                    """
                ),
                {"id": request.id},
            ).mappings().first()

            if c is None:
                context.abort(
                    grpc.StatusCode.NOT_FOUND,
                    f"No existe un cliente con id {request.id}",
                )

            return _fila_a_pb(c)

    def VerificarExistencia(self, request, context):
        print(f"[gRPC] VerificarExistencia({request.id}) invocado", flush=True)
        with self.engine.connect() as conn:
            existente = conn.execute(
                text("SELECT 1 FROM usuarios WHERE id = :id"),
                {"id": request.id},
            ).first()
            
            # Devuelve true si encontró un registro, false si no
            return pb.VerificarExistenciaResponse(existe=(existente is not None))

    def VerificarActivo(self, request, context):
        print(f"[gRPC] VerificarActivo({request.id}) invocado", flush=True)
        with self.engine.connect() as conn:
            c = conn.execute(
                text("SELECT activo FROM usuarios WHERE id = :id"),
                {"id": request.id},
            ).mappings().first()

            if c is None:
                context.abort(
                    grpc.StatusCode.NOT_FOUND,
                    f"No existe un cliente con id {request.id}",
                )

            return pb.VerificarActivoResponse(activo=c["activo"])

    def CrearCliente(self, request, context):
        print(f"[gRPC] CrearCliente({request.documento}) invocado", flush=True)
        with self.engine.begin() as conn:
            # 1. Validar que no exista
            existente = conn.execute(
                text("SELECT 1 FROM usuarios WHERE documento = :doc OR email = :email"),
                {"doc": request.documento, "email": request.email}
            ).first()
            if existente:
                context.abort(grpc.StatusCode.ALREADY_EXISTS, "Ya existe un cliente con ese documento o email")
            
            # 2. Hashear la contraseña usando bcrypt
            salt = bcrypt.gensalt(12)
            hashed_pw = bcrypt.hashpw(request.password.encode('utf-8'), salt).decode('utf-8')

            # 3. Insertar
            c = conn.execute(
                text("""
                    INSERT INTO usuarios 
                        (documento, nombre, apellido, email, telefono, "fechaNacimiento", "passwordHash", rol, activo)
                    VALUES 
                        (:doc, :nom, :ape, :email, :tel, :fNac, :pw, 'CLIENTE', true)
                    RETURNING id, documento, nombre, apellido, email, telefono, "fechaNacimiento", activo
                """),
                {
                    "doc": request.documento,
                    "nom": request.nombre,
                    "ape": request.apellido,
                    "email": request.email,
                    "tel": request.telefono if request.telefono else None,
                    "fNac": request.fecha_nacimiento if request.fecha_nacimiento else None,
                    "pw": hashed_pw
                }
            ).mappings().first()
            return _fila_a_pb(c)

    def ActualizarCliente(self, request, context):
        print(f"[gRPC] ActualizarCliente({request.id}) invocado", flush=True)
        sets = []
        parametros = {"id": request.id}

        if request.HasField("nombre"):
            sets.append("nombre = :nombre")
            parametros["nombre"] = request.nombre
        if request.HasField("apellido"):
            sets.append("apellido = :apellido")
            parametros["apellido"] = request.apellido
        if request.HasField("telefono"):
            sets.append("telefono = :telefono")
            parametros["telefono"] = request.telefono
        if request.HasField("fecha_nacimiento"):
            sets.append('"fechaNacimiento" = :fnac')
            parametros["fnac"] = request.fecha_nacimiento
        if request.HasField("activo"):
            sets.append("activo = :activo")
            parametros["activo"] = request.activo

        if not sets:
            return self.ObtenerCliente(request, context)

        sql = f"""
            UPDATE usuarios
            SET {', '.join(sets)}
            WHERE id = :id
            RETURNING id, documento, nombre, apellido, email, telefono, "fechaNacimiento", activo
        """
        with self.engine.begin() as conn:
            c = conn.execute(text(sql), parametros).mappings().first()
            if c is None:
                context.abort(grpc.StatusCode.NOT_FOUND, f"No existe un cliente con id {request.id}")
            return _fila_a_pb(c)

    def EliminarCliente(self, request, context):
        print(f"[gRPC] EliminarCliente({request.id}) invocado", flush=True)
        with self.engine.begin() as conn:
            c = conn.execute(
                text("""
                    UPDATE usuarios SET activo = false WHERE id = :id
                    RETURNING id, documento, nombre, apellido, email, telefono, "fechaNacimiento", activo
                """),
                {"id": request.id}
            ).mappings().first()
            
            if c is None:
                context.abort(grpc.StatusCode.NOT_FOUND, f"No existe un cliente con id {request.id}")
            return _fila_a_pb(c)    
        

def main():
    engine = engine_desde_env()
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    pb_grpc.add_ClienteServiceServicer_to_server(
        ClienteServiceServicer(engine), server
    )
    
    # Usamos el puerto 50052 por defecto para clientes
    puerto = os.environ.get("GRPC_PORT", "50052")
    server.add_insecure_port(f"[::]:{puerto}")
    print(f"Customer Service escuchando en puerto {puerto}", flush=True)
    
    server.start()
    server.wait_for_termination()

if __name__ == "__main__":
    main()