import { ServiceError } from '@grpc/grpc-js';

export function isGrpcServiceError(error: unknown): error is ServiceError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'number' &&
    'details' in error &&
    typeof error.details === 'string'
  );
}

export function grpcErrorMessage(error: unknown): string {
  if (isGrpcServiceError(error)) return error.details || error.message;
  if (error instanceof Error) return error.message;
  return 'error desconocido';
}
