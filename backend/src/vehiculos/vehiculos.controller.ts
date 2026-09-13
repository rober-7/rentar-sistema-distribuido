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
import { VehiculosService } from './vehiculos.service';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { UpdateVehiculoDto } from './dto/update-vehiculo.dto';
import { Vehiculo } from './entities/vehiculo.entity';

@ApiTags('Vehiculos')
@Controller('vehiculos')
export class VehiculosController {
  constructor(private readonly vehiculosService: VehiculosService) {}

  @Post()
  @ApiOperation({
    summary: 'Da de alta un vehículo (siempre queda DISPONIBLE y activo)',
  })
  @ApiResponse({ status: 201, description: 'Vehículo creado', type: Vehiculo })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un vehículo con esa patente',
  })
  create(@Body() createVehiculoDto: CreateVehiculoDto): Promise<Vehiculo> {
    return this.vehiculosService.create(createVehiculoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista todos los vehículos' })
  @ApiResponse({
    status: 200,
    description: 'Listado de vehículos',
    type: [Vehiculo],
  })
  findAll(): Promise<Vehiculo[]> {
    return this.vehiculosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta un vehículo por id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Vehículo encontrado',
    type: Vehiculo,
  })
  @ApiResponse({ status: 404, description: 'No existe un vehículo con ese id' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Vehiculo> {
    return this.vehiculosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Modifica un vehículo. La patente nunca se puede modificar',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Vehículo actualizado',
    type: Vehiculo,
  })
  @ApiResponse({ status: 404, description: 'No existe un vehículo con ese id' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVehiculoDto: UpdateVehiculoDto,
  ): Promise<Vehiculo> {
    return this.vehiculosService.update(id, updateVehiculoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Baja lógica de un vehículo (activo = false)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Vehículo dado de baja',
    type: Vehiculo,
  })
  @ApiResponse({ status: 404, description: 'No existe un vehículo con ese id' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<Vehiculo> {
    return this.vehiculosService.remove(id);
  }
}
