import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateClienteDto } from './create-cliente.dto';
export class UpdateClienteDto extends PartialType(
  OmitType(CreateClienteDto, ['documento', 'password'] as const),
) {
  @ApiPropertyOptional({
    description:
      'Reactiva o da de baja al cliente. Solo accesible por ADMIN (todo el controller de clientes ya lo exige).',
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
