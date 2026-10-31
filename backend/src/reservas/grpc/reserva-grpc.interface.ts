import { Observable } from 'rxjs';

export interface ReservaGrpc {
  id: number;
  vehiculoId: number;
  clienteId: number;
  fechaInicio: string;
  fechaFinalizacion: string;
  importeTotal: number;
  estado: string;
  activo: boolean;
}

export interface ReservaGrpcResponse {
  reserva: ReservaGrpc;
}

export interface ReservaServiceGrpcClient {
  crearReserva(data: {
    vehiculoId: number;
    clienteId: number;
    fechaInicio: string;
    fechaFinalizacion: string;
  }): Observable<ReservaGrpcResponse>;
  listarReservas(data: {
    clienteId?: number;
    estado?: string;
  }): Observable<{ reservas: ReservaGrpc[] }>;
  cancelarReserva(data: {
    id: number;
    clienteId: number;
  }): Observable<ReservaGrpcResponse>;
  listarHistorial(data: {
    clienteId?: number;
  }): Observable<{ reservas: ReservaGrpc[] }>;
  listarVehiculosOcupados(data: {
    fechaInicio: string;
    fechaFinalizacion: string;
  }): Observable<{ vehiculoIds: number[] }>;
  listarEstadosVehiculos(data: { vehiculoIds: number[] }): Observable<{
    estados: Array<{ vehiculoId: number; estado: string }>;
  }>;
}
