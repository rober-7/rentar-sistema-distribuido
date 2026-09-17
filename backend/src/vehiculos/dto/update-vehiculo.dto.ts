import { OmitType, PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateVehiculoDto } from './create-vehiculo.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateVehiculoDto extends PartialType(
  OmitType(CreateVehiculoDto, ['patente'] as const),
) {
  @ApiPropertyOptional({ description: 'Estado lógico del vehículo (true=Operativo, false=Baja)' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
