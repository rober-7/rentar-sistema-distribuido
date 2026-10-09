import { Observable } from 'rxjs';

export interface VehiculoGrpc {
  id: number;
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  color?: string;
  tipoVehiculo: string;
  precioDiario: number;
  estado: string;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ConsultarDisponibilidadGrpcRequest {
  fechaInicio: string;
  fechaFinalizacion: string;
  tipoVehiculo?: string;
  marca?: string;
  modelo?: string;
  precioMinimo?: number;
  precioMaximo?: number;
}

export interface CrearVehiculoGrpcRequest {
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  color?: string;
  tipoVehiculo: string;
  precioDiario: number;
}

export interface ActualizarVehiculoGrpcRequest {
  id: number;
  marca?: string;
  modelo?: string;
  anio?: number;
  // '' (string vacío) limpia la columna a NULL, omitir la clave = no tocar.
  color?: string;
  tipoVehiculo?: string;
  precioDiario?: number;
  activo?: boolean;
}

export interface VehiculoServiceGrpcClient {
  listarVehiculos(data: Record<string, never>): Observable<{
    vehiculos: VehiculoGrpc[];
  }>;
  obtenerVehiculo(data: { id: number }): Observable<VehiculoGrpc>;
  consultarDisponibilidad(
    data: ConsultarDisponibilidadGrpcRequest,
  ): Observable<{ vehiculos: VehiculoGrpc[] }>;
  crearVehiculo(data: CrearVehiculoGrpcRequest): Observable<VehiculoGrpc>;
  actualizarVehiculo(
    data: ActualizarVehiculoGrpcRequest,
  ): Observable<VehiculoGrpc>;
}
