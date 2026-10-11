import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClienteResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  documento: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  apellido: string;

  @ApiProperty({ format: 'email' })
  email: string;

  @ApiPropertyOptional({ nullable: true })
  telefono?: string;

  @ApiProperty({ example: '1990-05-15', format: 'date' })
  fechaNacimiento: string;

  @ApiProperty()
  activo: boolean;
}
