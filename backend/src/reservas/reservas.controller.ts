import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReservasService } from './reservas.service';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { Reserva } from './entities/reserva.entity';
import { Authenticated } from '../auth/auth.guards';
import { Roles } from '../auth/roles.decorator';
import { RolUsuario } from '../clientes/enums/rol-usuario.enum';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
@ApiTags('Reservas')
@ApiBearerAuth()
@Controller('reservas')
@Authenticated()
@Roles(RolUsuario.CLIENTE)
@ApiResponse({ status: 401, description: 'Falta el JWT o es inválido/expiró' })
@ApiResponse({
  status: 403,
  description: 'El usuario autenticado no tiene rol CLIENTE',
})
export class ReservasController {
  constructor(private readonly reservas: ReservasService) {}
  @Post()
  @ApiOperation({ summary: 'Crea una reserva para el cliente autenticado' })
  @ApiResponse({ status: 201, type: Reserva })
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos: fechas no parseables, DTO mal formado ' +
      '(vehiculo debe ser un entero positivo), la fecha de inicio no es ' +
      'futura, o la fecha de finalización no es posterior a la de inicio',
  })
  @ApiResponse({
    status: 404,
    description:
      'No existe un vehículo con ese id, o el cliente autenticado no ' +
      'existe/está inactivo (puede pasar si se desactivó la cuenta ' +
      'después de emitido el JWT)',
  })
  @ApiResponse({
    status: 409,
    description:
      'El vehículo está inactivo, o ya tiene otra reserva CONFIRMADA que ' +
      'se superpone con el período solicitado',
  })
  create(
    @Body() dto: CreateReservaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservas.create(dto, user.id);
  }
  @Patch(':id/cancelar')
  @ApiOperation({ summary: 'Cancela una reserva propia antes de su inicio' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Reserva cancelada', type: Reserva })
  @ApiResponse({
    status: 400,
    description: 'El id de la URL no es un número entero',
  })
  @ApiResponse({
    status: 403,
    description: 'La reserva existe pero pertenece a otro cliente',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe una reserva con ese id',
  })
  @ApiResponse({
    status: 409,
    description:
      'La reserva ya estaba cancelada, o su alquiler ya comenzó ' +
      '(fechaInicio ya pasó) y no se puede cancelar',
  })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservas.cancel(id, user.id);
  }
}
