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

export interface ReservaServiceGrpcClient {
  crearReserva(data: {
    vehiculoId: number;
    clienteId: number;
    fechaInicio: string;
    fechaFinalizacion: string;
  }): Observable<ReservaGrpc>;
  consultarReservas(data: {
    clienteId?: number;
    estado?: string;
  }): Observable<{ reservas: ReservaGrpc[] }>;
  cancelarReserva(data: {
    id: number;
    clienteId: number;
  }): Observable<ReservaGrpc>;
  consultarHistorial(data: {
    clienteId?: number;
  }): Observable<{ reservas: ReservaGrpc[] }>;
}
