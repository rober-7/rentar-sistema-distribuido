import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateVehiculoDto } from './create-vehiculo.dto';

export class UpdateVehiculoDto extends PartialType(
  OmitType(CreateVehiculoDto, ['patente'] as const),
) {}
