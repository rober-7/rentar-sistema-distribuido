import { Observable } from 'rxjs';

export interface ClienteGrpc {
  id: number;
  documento: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  fechaNacimiento: string;
  activo: boolean;
}

export interface ListarClientesGrpcRequest {}

export interface ObtenerClienteGrpcRequest {
  id: number;
}

export interface VerificarExistenciaGrpcRequest {
  id: number;
}

export interface VerificarExistenciaGrpcResponse {
  existe: boolean;
}

export interface VerificarActivoGrpcRequest {
  id: number;
}

export interface VerificarActivoGrpcResponse {
  activo: boolean;
}

export interface CrearClienteGrpcRequest {
  documento: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  // NestJS con keepCase: false transforma fecha_nacimiento (del .proto) a camelCase
  fechaNacimiento: string; 
  password: string;
}

export interface ActualizarClienteGrpcRequest {
  id: number;
  nombre?: string;
  apellido?: string;
  telefono?: string;
  fechaNacimiento?: string;
  activo?: boolean;
}

export interface EliminarClienteGrpcRequest {
  id: number;
}

export interface ValidarLoginGrpcRequest {
  email: string;
  password: string;
}

export interface ValidarLoginGrpcResponse {
  valido: boolean;
  id?: number;
  email?: string;
  rol?: string;
}

export interface ClienteServiceGrpcClient {
  listarClientes(data: ListarClientesGrpcRequest): Observable<{ clientes: ClienteGrpc[] }>;
  obtenerCliente(data: ObtenerClienteGrpcRequest): Observable<ClienteGrpc>;
  verificarExistencia(data: VerificarExistenciaGrpcRequest): Observable<VerificarExistenciaGrpcResponse>;
  verificarActivo(data: VerificarActivoGrpcRequest): Observable<VerificarActivoGrpcResponse>;
  crearCliente(
    data: CrearClienteGrpcRequest & { rol?: string },
  ): Observable<ClienteGrpc>;
  actualizarCliente(data: ActualizarClienteGrpcRequest): Observable<ClienteGrpc>;
  eliminarCliente(data: EliminarClienteGrpcRequest): Observable<ClienteGrpc>;
  validarLogin(data: ValidarLoginGrpcRequest): Observable<ValidarLoginGrpcResponse>;
}