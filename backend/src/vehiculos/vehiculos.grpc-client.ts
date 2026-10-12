import { join } from 'path';
import { ClientProviderOptions, Transport } from '@nestjs/microservices';
import { VEHICULO_PACKAGE } from './vehiculos.constants';

export function vehiculoGrpcClientOptions(): ClientProviderOptions {
  return {
    name: VEHICULO_PACKAGE,
    transport: Transport.GRPC,
    options: {
      package: 'vehiculos',
      protoPath: join(process.cwd(), 'proto/vehiculos.proto'),
      url: process.env.VEHICLE_SERVICE_URL ?? 'localhost:50051',
      loader: { keepCase: false, enums: String, defaults: true },
    },
  };
}
