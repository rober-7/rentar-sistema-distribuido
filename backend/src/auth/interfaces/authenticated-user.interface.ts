import { RolUsuario } from '../../clientes/enums/rol-usuario.enum';
export interface AuthenticatedUser {
  id: number;
  email: string;
  rol: RolUsuario;
}
