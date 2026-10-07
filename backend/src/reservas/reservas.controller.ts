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
export class ReservasController {
  constructor(private readonly reservas: ReservasService) {}
  @Post()
  @ApiOperation({ summary: 'Crea una reserva para el cliente autenticado' })
  @ApiResponse({ status: 201, type: Reserva })
  create(
    @Body() dto: CreateReservaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservas.create(dto, user.id);
  }
  @Patch(':id/cancelar')
  @ApiOperation({ summary: 'Cancela una reserva propia antes de su inicio' })
  @ApiParam({ name: 'id', type: Number })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservas.cancel(id, user.id);
  }
}
