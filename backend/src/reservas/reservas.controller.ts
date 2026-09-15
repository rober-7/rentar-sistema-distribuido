import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReservasService } from './reservas.service';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { Reserva } from './entities/reserva.entity';

@ApiTags('Reservas')
@Controller('reservas')
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Post()
  @ApiOperation({
    summary: 'Da de alta una reserva',
    description:
      'Recibe los IDs del cliente y vehículo y un período futuro. Calcula el importe por bloques de 24 horas redondeados hacia arriba y crea una reserva CONFIRMADA. Permite períodos consecutivos sin solapamiento.',
  })
  @ApiResponse({ status: 201, description: 'Reserva creada', type: Reserva })
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos, inicio no futuro o finalización no posterior al inicio',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente o vehículo inexistente',
  })
  @ApiResponse({
    status: 409,
    description:
      'Cliente o vehículo inactivo, vehículo en alquiler o reserva solapada',
  })
  create(@Body() createReservaDto: CreateReservaDto): Promise<Reserva> {
    return this.reservasService.create(createReservaDto);
  }
}
