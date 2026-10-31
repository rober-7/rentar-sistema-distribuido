import {
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  OnModuleInit,
  Post,
  UseGuards,
} from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RolUsuario } from '../clientes/enums/rol-usuario.enum';
import { VEHICULO_PACKAGE } from './vehiculos.constants';
import {
  VehiculoExternoGrpc,
  VehiculoServiceGrpcClient,
} from './grpc/vehiculo-grpc.interface';
import { CreateVehiculoExternoDto } from './dto/create-vehiculo-externo.dto';
import {
  ResultadoValidacionExterno,
  VehiculoExternoResponseDto,
} from './dto/vehiculo-externo-response.dto';
import {
  grpcErrorMessage,
  isGrpcServiceError,
} from '../common/grpc/grpc-error';
import { toProtoEnum } from '../common/grpc/proto-enum';
import { fromVehiculoExternoProto } from './grpc/vehiculo-grpc.mapper';

/**
 * Vehicle Service omite cada validación mientras su resultado no llegó por
 * RabbitMQ; la API lo expone explícito como PENDIENTE.
 */
function resultadoValidacion(valor?: string): ResultadoValidacionExterno {
  return valor === ResultadoValidacionExterno.VALIDADO ||
    valor === ResultadoValidacionExterno.RECHAZADO
    ? valor
    : ResultadoValidacionExterno.PENDIENTE;
}

function conValidaciones(externo: VehiculoExternoGrpc): VehiculoExternoGrpc {
  return {
    ...externo,
    validacionPatente: resultadoValidacion(externo.validacionPatente),
    validacionTitularidad: resultadoValidacion(externo.validacionTitularidad),
  };
}

@ApiTags('Vehiculos Externos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.CLIENTE)
@ApiResponse({ status: 401, description: 'Falta el JWT o es inválido/expiró' })
@ApiResponse({
  status: 403,
  description: 'El usuario autenticado no tiene rol CLIENTE',
})
@ApiResponse({
  status: 500,
  description:
    'El Vehicle Service respondió con un error gRPC no contemplado ' +
    '(ej. no disponible, timeout, error interno)',
})
@Controller('vehiculos/externos')
export class VehiculosExternosController implements OnModuleInit {
  private vehiculoGrpcService: VehiculoServiceGrpcClient;

  constructor(
    @Inject(VEHICULO_PACKAGE) private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.vehiculoGrpcService =
      this.grpcClient.getService<VehiculoServiceGrpcClient>('VehiculoService');
  }

  @Post()
  @ApiOperation({
    summary:
      'Registra un vehículo de un propietario externo con estado PENDIENTE y dispara las validaciones asíncronas',
  })
  @ApiResponse({
    status: 201,
    description:
      'Solicitud de vehículo externo registrada con estado PENDIENTE',
    type: VehiculoExternoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'DTO inválido: campos obligatorios faltantes o fuera de rango',
  })
  @ApiResponse({
    status: 409,
    description:
      'Ya existe un vehículo o una solicitud en trámite con esa patente',
  })
  async create(
    @Body() createDto: CreateVehiculoExternoDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<VehiculoExternoGrpc> {
    try {
      const { vehiculo } = await lastValueFrom(
        this.vehiculoGrpcService.registrarVehiculoExterno({
          ...createDto,
          clienteId: user.id,
          tipoVehiculo: toProtoEnum('TIPO_VEHICULO', createDto.tipoVehiculo),
        }),
      );
      return conValidaciones(fromVehiculoExternoProto(vehiculo));
    } catch (error) {
      if (
        isGrpcServiceError(error) &&
        error.code === GrpcStatus.ALREADY_EXISTS
      ) {
        throw new ConflictException(
          grpcErrorMessage(error) ||
            `Ya existe un vehículo o solicitud en trámite con la patente ${createDto.patente}`,
        );
      }
      throw new InternalServerErrorException(
        'Vehicle Service no pudo completar RegistrarVehiculoExterno: ' +
          grpcErrorMessage(error),
      );
    }
  }

  @Get()
  @ApiOperation({
    summary:
      'Lista las solicitudes de vehículos externos del cliente autenticado con su estado y el resultado de cada validación',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitudes del cliente, de la más nueva a la más vieja',
    type: [VehiculoExternoResponseDto],
  })
  async findMine(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<VehiculoExternoGrpc[]> {
    // Igual que en el alta, el clienteId sale del JWT: cada cliente solo ve
    // sus propias solicitudes.
    try {
      const { vehiculos } = await lastValueFrom(
        this.vehiculoGrpcService.listarVehiculosExternos({
          clienteId: user.id,
        }),
      );
      return (vehiculos ?? [])
        .map(fromVehiculoExternoProto)
        .map(conValidaciones);
    } catch (error) {
      throw new InternalServerErrorException(
        'Vehicle Service no pudo completar ListarVehiculosExternos: ' +
          grpcErrorMessage(error),
      );
    }
  }
}
