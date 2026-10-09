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

export interface VehiculoServiceGrpcClient {
  listarVehiculos(data: Record<string, never>): Observable<{
    vehiculos: VehiculoGrpc[];
  }>;
  obtenerVehiculo(data: { id: number }): Observable<VehiculoGrpc>;
  consultarDisponibilidad(
    data: ConsultarDisponibilidadGrpcRequest,
  ): Observable<{ vehiculos: VehiculoGrpc[] }>;
}
