import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Cliente } from './entities/cliente.entity';

@ApiTags('Clientes')
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @ApiOperation({ summary: 'Da de alta un cliente' })
  @ApiResponse({ status: 201, description: 'Cliente creado', type: Cliente })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un cliente con ese documento o email',
  })
  create(@Body() createClienteDto: CreateClienteDto): Promise<Cliente> {
    return this.clientesService.create(createClienteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista todos los clientes' })
  @ApiResponse({
    status: 200,
    description: 'Listado de clientes',
    type: [Cliente],
  })
  findAll(): Promise<Cliente[]> {
    return this.clientesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta un cliente por id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Cliente encontrado',
    type: Cliente,
  })
  @ApiResponse({ status: 404, description: 'No existe un cliente con ese id' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Cliente> {
    return this.clientesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Modifica un cliente. El documento no se puede modificar',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Cliente actualizado',
    type: Cliente,
  })
  @ApiResponse({ status: 404, description: 'No existe un cliente con ese id' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClienteDto: UpdateClienteDto,
  ): Promise<Cliente> {
    return this.clientesService.update(id, updateClienteDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Baja lógica de un cliente (activo = false)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Cliente dado de baja',
    type: Cliente,
  })
  @ApiResponse({ status: 404, description: 'No existe un cliente con ese id' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<Cliente> {
    return this.clientesService.remove(id);
  }
}
