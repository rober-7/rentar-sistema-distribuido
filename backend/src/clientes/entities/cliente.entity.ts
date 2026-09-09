import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('clientes')
export class Cliente {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ type: 'varchar', unique: true })
  documento: string;

  @ApiProperty()
  @Column({ type: 'varchar' })
  nombre: string;

  @ApiProperty()
  @Column({ type: 'varchar' })
  apellido: string;

  @ApiProperty()
  @Column({ type: 'varchar', unique: true })
  email: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', nullable: true })
  telefono: string | null;

  @ApiProperty({ example: '1990-05-15', description: 'Fecha de nacimiento' })
  @Column({ type: 'date' })
  fechaNacimiento: string;

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
