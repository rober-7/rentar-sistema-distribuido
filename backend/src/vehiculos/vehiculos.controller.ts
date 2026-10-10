import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { UpdateVehiculoDto } from './dto/update-vehiculo.dto';
import { Vehiculo } from './entities/vehiculo.entity';
import { Authenticated } from '../auth/auth.guards';
import { Roles } from '../auth/roles.decorator';
import { RolUsuario } from '../clientes/enums/rol-usuario.enum';
import { VEHICULO_PACKAGE } from './vehiculos.constants';
import {
  VehiculoGrpc,
  VehiculoServiceGrpcClient,
} from './grpc/vehiculo-grpc.interface';

@ApiTags('Vehiculos')
@ApiBearerAuth()
@Authenticated()
@Roles(RolUsuario.ADMIN)
@ApiResponse({ status: 401, description: 'Falta el JWT o es inválido/expiró' })
@ApiResponse({
  status: 403,
  description: 'El usuario autenticado no tiene rol ADMIN',
})
@ApiResponse({
  status: 500,
  description:
    'El Vehicle Service respondió con un error gRPC no contemplado ' +
    '(ej. no disponible, timeout, error interno)',
})
@Controller('vehiculos')
export class VehiculosController implements OnModuleInit {
  private vehiculoGrpcService: VehiculoServiceGrpcClient;

  constructor(
    @Inject(VEHICULO_PACKAGE) private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.vehiculoGrpcService =
      this.grpcClient.getService<VehiculoServiceGrpcClient>(
        'VehiculoService',
      );
  }

  @Post()
  @ApiOperation({
    summary:
      'Da de alta un vehículo (siempre queda DISPONIBLE y activo; vía Vehicle Service, gRPC)',
  })
  @ApiResponse({ status: 201, description: 'Vehículo creado', type: Vehiculo })
  @ApiResponse({
    status: 400,
    description:
      'DTO inválido: año fuera de rango, tipoVehiculo no es un valor del ' +
      'enum, precioDiario no es positivo, o falta algún campo obligatorio',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un vehículo con esa patente',
  })
  async create(
    @Body() createVehiculoDto: CreateVehiculoDto,
  ): Promise<VehiculoGrpc> {
    try {
      return await firstValueFrom(
        this.vehiculoGrpcService.crearVehiculo(createVehiculoDto),
      );
    } catch (error) {
      if (error?.code === GrpcStatus.ALREADY_EXISTS) {
        throw new ConflictException(
          `Ya existe un vehículo con la patente ${createVehiculoDto.patente}`,
        );
      }
      this.lanzarErrorGrpc(error, 'CrearVehiculo');
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Lista todos los vehículos (vía Vehicle Service, gRPC)',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de vehículos',
    type: [Vehiculo],
  })
  async findAll(): Promise<VehiculoGrpc[]> {
    try {
      const { vehiculos } = await firstValueFrom(
        this.vehiculoGrpcService.listarVehiculos({}),
      );
      return vehiculos;
    } catch (error) {
      this.lanzarErrorGrpc(error, 'ListarVehiculos');
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consulta un vehículo por id (vía Vehicle Service, gRPC)',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Vehículo encontrado',
    type: Vehiculo,
  })
  @ApiResponse({
    status: 400,
    description: 'El id de la URL no es un número entero',
  })
  @ApiResponse({ status: 404, description: 'No existe un vehículo con ese id' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<VehiculoGrpc> {
    try {
      return await firstValueFrom(
        this.vehiculoGrpcService.obtenerVehiculo({ id }),
      );
    } catch (error) {
      if (error?.code === GrpcStatus.NOT_FOUND) {
        throw new NotFoundException(`No existe un vehículo con id ${id}`);
      }
      this.lanzarErrorGrpc(error, 'ObtenerVehiculo');
    }
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Modifica un vehículo. La patente nunca se puede modificar (vía Vehicle Service, gRPC)',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Vehículo actualizado',
    type: Vehiculo,
  })
  @ApiResponse({
    status: 400,
    description:
      'El id de la URL no es un número entero, o el DTO tiene campos ' +
      'inválidos (ej. tipoVehiculo fuera del enum, precioDiario negativo)',
  })
  @ApiResponse({ status: 404, description: 'No existe un vehículo con ese id' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVehiculoDto: UpdateVehiculoDto,
  ): Promise<VehiculoGrpc> {
    return this.actualizarPorGrpc(id, updateVehiculoDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'Baja lógica de un vehículo (activo = false; vía Vehicle Service, gRPC)',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Vehículo dado de baja',
    type: Vehiculo,
  })
  @ApiResponse({
    status: 400,
    description: 'El id de la URL no es un número entero',
  })
  @ApiResponse({ status: 404, description: 'No existe un vehículo con ese id' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<VehiculoGrpc> {
    return this.actualizarPorGrpc(id, { activo: false });
  }

  private async actualizarPorGrpc(
    id: number,
    dto: UpdateVehiculoDto | { activo: false },
  ): Promise<VehiculoGrpc> {
    // protobuf optional no distingue "ausente" de "null": un color null
    // explícito (limpiar el campo) se manda como '' y se omite la clave
    // cuando no vino en el DTO, para que el servicio sepa si debe tocarlo.
    const { color, ...resto } = dto as UpdateVehiculoDto;
    const request = {
      id,
      ...resto,
      ...(color !== undefined ? { color: color ?? '' } : {}),
    };
    try {
      return await firstValueFrom(
        this.vehiculoGrpcService.actualizarVehiculo(request),
      );
    } catch (error) {
      if (error?.code === GrpcStatus.NOT_FOUND) {
        throw new NotFoundException(`No existe un vehículo con id ${id}`);
      }
      this.lanzarErrorGrpc(error, 'ActualizarVehiculo');
    }
  }

  /**
   * Cualquier error gRPC no contemplado explícitamente (servicio caído,
   * timeout, INTERNAL, etc.) se traduce a un 500 con mensaje claro en vez
   * de dejar que la excepción cruda de gRPC llegue al filtro por defecto
   * de Nest.
   */
  private lanzarErrorGrpc(error: any, operacion: string): never {
    throw new InternalServerErrorException(
      `Vehicle Service no pudo completar ${operacion}: ` +
        (error?.details ?? error?.message ?? 'error desconocido'),
    );
  }
}
