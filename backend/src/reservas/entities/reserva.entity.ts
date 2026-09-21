import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Vehiculo } from '../../vehiculos/entities/vehiculo.entity';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { EstadoReserva } from '../enums/estado-reserva.enum';

@Entity('reservas')
export class Reserva {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ type: () => Vehiculo })
  @ManyToOne(() => Vehiculo, { nullable: false })
  @JoinColumn({ name: 'vehiculo_id' })
  vehiculo: Vehiculo;

  @ApiProperty({ type: () => Cliente })
  @ManyToOne(() => Cliente, { nullable: false })
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;

  @ApiProperty({
    example: '2026-09-14T10:00:00-03:00',
    description: 'Fecha y hora de inicio de la reserva',
    type: String,
    format: 'date-time',
  })
  @Column({ type: 'timestamptz' })
  fechaInicio: Date;

  @ApiProperty({
    example: '2026-09-14T10:00:00-03:00',
    description: 'Fecha y hora de finalización de la reserva',
    type: String,
    format: 'date-time',
  })
  @Column({ type: 'timestamptz' })
  fechaFinalizacion: Date;

  @ApiProperty()
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | null) =>
        value === null ? null : parseFloat(value),
    },
  })
  importeTotal: number;

  @ApiProperty({ enum: EstadoReserva })
  @Column({
    type: 'enum',
    enum: EstadoReserva,
    default: EstadoReserva.CONFIRMADA,
  })
  estado: EstadoReserva;

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
