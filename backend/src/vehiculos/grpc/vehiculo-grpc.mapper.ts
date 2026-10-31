import { fromProtoEnum } from '../../common/grpc/proto-enum';
import { VehiculoExternoGrpc, VehiculoGrpc } from './vehiculo-grpc.interface';

export function fromVehiculoProto(vehiculo: VehiculoGrpc): VehiculoGrpc {
  return {
    ...vehiculo,
    tipoVehiculo: fromProtoEnum('TIPO_VEHICULO', vehiculo.tipoVehiculo),
    estado: fromProtoEnum('ESTADO_VEHICULO', vehiculo.estado),
    ...(vehiculo.verificacion !== undefined && {
      verificacion: fromProtoEnum(
        'RESULTADO_VERIFICACION',
        vehiculo.verificacion,
      ),
    }),
  };
}

export function fromVehiculoExternoProto(
  vehiculo: VehiculoExternoGrpc,
): VehiculoExternoGrpc {
  return {
    ...vehiculo,
    tipoVehiculo: fromProtoEnum('TIPO_VEHICULO', vehiculo.tipoVehiculo),
    estado: fromProtoEnum('ESTADO_VEHICULO_EXTERNO', vehiculo.estado),
  };
}
