import { join } from 'path';
import { ClientProviderOptions, Transport } from '@nestjs/microservices';
import { CLIENTE_PACKAGE } from './clientes.constants';

export function clienteGrpcClientOptions(): ClientProviderOptions {
  return {
    name: CLIENTE_PACKAGE,
    transport: Transport.GRPC,
    options: {
      package: 'clientes', // Tiene que coincidir con "package clientes;" del .proto
      protoPath: join(process.cwd(), 'proto/clientes.proto'),
      url: process.env.CUSTOMER_SERVICE_URL ?? 'localhost:50052',
      loader: { keepCase: false, enums: String, defaults: true },
    },
  };
}