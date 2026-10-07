import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
export const Authenticated = () =>
  applyDecorators(UseGuards(JwtAuthGuard, RolesGuard));
