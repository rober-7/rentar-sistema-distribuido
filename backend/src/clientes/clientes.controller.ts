import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Inject,
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
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Usuario } from './entities/usuario.entity';
import { Authenticated } from '../auth/auth.guards';
import { Roles } from '../auth/roles.decorator';
import { RolUsuario } from './enums/rol-usuario.enum';
import { CLIENTE_PACKAGE } from './clientes.constants';
import {
  ClienteGrpc,
  ClienteServiceGrpcClient,
} from './grpc/cliente-grpc.interface';

@ApiTags('Clientes')
@ApiBearerAuth()
@Authenticated()
@Roles(RolUsuario.ADMIN)
@Controller('clientes')
export class ClientesController implements OnModuleInit {
  private clienteGrpcService: ClienteServiceGrpcClient;

  constructor(
    @Inject(CLIENTE_PACKAGE) private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.clienteGrpcService =
      this.grpcClient.getService<ClienteServiceGrpcClient>('ClienteService');
  }

  @Post()
  @ApiOperation({ summary: 'Da de alta un cliente (vía Customer Service, gRPC)' })
  @ApiResponse({ status: 201, description: 'Cliente creado', type: Usuario })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un cliente con ese documento o email',
  })
  async create(@Body() createClienteDto: CreateClienteDto): Promise<ClienteGrpc> {
    try {
      return await firstValueFrom(
        this.clienteGrpcService.crearCliente(createClienteDto),
      );
    } catch (error) {
      if (error?.code === GrpcStatus.ALREADY_EXISTS) {
        throw new ConflictException(
          `Ya existe un cliente con el documento ${createClienteDto.documento} o ese email`,
        );
      }
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lista todos los clientes (vía Customer Service, gRPC)' })
  @ApiResponse({
    status: 200,
    description: 'Listado de clientes',
    type: [Usuario],
  })
  async findAll(): Promise<ClienteGrpc[]> {
    const response = await firstValueFrom(
      this.clienteGrpcService.listarClientes({}),
    );
    // Retornamos el array o uno vacío si no hay registros
    return response.clientes || [];
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta un cliente por id (vía Customer Service, gRPC)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Cliente encontrado',
    type: Usuario,
  })
  @ApiResponse({ status: 404, description: 'No existe un cliente con ese id' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ClienteGrpc> {
    try {
      return await firstValueFrom(
        this.clienteGrpcService.obtenerCliente({ id }),
      );
    } catch (error) {
      if (error?.code === GrpcStatus.NOT_FOUND) {
        throw new NotFoundException(`No existe un cliente con id ${id}`);
      }
      throw error;
    }
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Modifica un cliente. El documento no se puede modificar (vía Customer Service, gRPC)',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Cliente actualizado',
    type: Usuario,
  })
  @ApiResponse({ status: 404, description: 'No existe un cliente con ese id' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClienteDto: UpdateClienteDto,
  ): Promise<ClienteGrpc> {
    try {
      return await firstValueFrom(
        this.clienteGrpcService.actualizarCliente({ id, ...updateClienteDto }),
      );
    } catch (error) {
      if (error?.code === GrpcStatus.NOT_FOUND) {
        throw new NotFoundException(`No existe un cliente con id ${id}`);
      }
      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Baja lógica de un cliente (activo = false; vía Customer Service, gRPC)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Cliente dado de baja',
    type: Usuario,
  })
  @ApiResponse({ status: 404, description: 'No existe un cliente con ese id' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<ClienteGrpc> {
    try {
      // Usamos el método específico que definimos en tu Python para eliminar
      return await firstValueFrom(
        this.clienteGrpcService.eliminarCliente({ id }),
      );
    } catch (error) {
      if (error?.code === GrpcStatus.NOT_FOUND) {
        throw new NotFoundException(`No existe un cliente con id ${id}`);
      }
      throw error;
    }
  }
}