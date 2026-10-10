import { join } from 'path';
import { ClientProviderOptions, Transport } from '@nestjs/microservices';
import { RENTAL_PACKAGE } from './rental.constants';

export function rentalGrpcClientOptions(): ClientProviderOptions {
  return {
    name: RENTAL_PACKAGE,
    transport: Transport.GRPC,
    options: {
      package: 'reservas',
      protoPath: join(process.cwd(), 'proto/reservas.proto'),
      url: process.env.RENTAL_SERVICE_URL ?? 'localhost:50053',
      loader: { keepCase: false, enums: String, defaults: true },
    },
  };
}
