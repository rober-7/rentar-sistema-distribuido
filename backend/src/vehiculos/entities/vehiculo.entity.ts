import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { TipoVehiculo } from '../enums/tipo-vehiculo.enum';
import { EstadoVehiculo } from '../enums/estado-vehiculo.enum';

@Entity('vehiculos')
export class Vehiculo {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ type: 'varchar', unique: true })
  patente: string;

  @ApiProperty()
  @Column({ type: 'varchar' })
  marca: string;

  @ApiProperty()
  @Column({ type: 'varchar' })
  modelo: string;

  @ApiProperty()
  @Column({ type: 'int' })
  anio: number;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', nullable: true })
  color: string | null;

  @ApiProperty({ enum: TipoVehiculo })
  @Column({ type: 'enum', enum: TipoVehiculo })
  tipoVehiculo: TipoVehiculo;

  @ApiProperty()
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | null) => (value === null ? null : parseFloat(value)),
    },
  })
  precioDiario: number;

  @ApiProperty({ enum: EstadoVehiculo })
  @Column({ type: 'enum', enum: EstadoVehiculo, default: EstadoVehiculo.DISPONIBLE })
  estado: EstadoVehiculo;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @ApiProperty()
  @CreateDateColumn()
  creadoEn: Date;

  @ApiProperty()
  @UpdateDateColumn()
  actualizadoEn: Date;
}
