import { fromProtoEnum } from '../../common/grpc/proto-enum';
import { ReservaGrpc } from './reserva-grpc.interface';

export function fromReservaProto(reserva: ReservaGrpc): ReservaGrpc {
  return {
    ...reserva,
    estado: fromProtoEnum('ESTADO_RESERVA', reserva.estado),
  };
}
