import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RolUsuario } from '../enums/rol-usuario.enum';

@Entity('usuarios')
export class Usuario {
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

  @ApiHideProperty()
  @Column({ type: 'varchar', select: false })
  passwordHash: string;

  @ApiProperty({ enum: RolUsuario })
  @Column({
    type: 'enum',
    enum: RolUsuario,
    default: RolUsuario.CLIENTE,
  })
  rol: RolUsuario;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', nullable: true })
  telefono: string | null;

  @ApiProperty({ example: '1990-05-15' })
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