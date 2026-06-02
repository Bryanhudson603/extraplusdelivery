import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  mixin,
  type CanActivate
} from '@nestjs/common';
import { getAuthPayloadFromRequest, type AuthTokenPayload } from './auth-token';

export function RequireAuth(...allowed: AuthTokenPayload['tipo'][]) {
  class RequireAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      const payload = getAuthPayloadFromRequest({ headers: req?.headers });
      if (!payload) {
        throw new UnauthorizedException('Não autenticado');
      }
      if (allowed.length > 0 && !allowed.includes(payload.tipo)) {
        throw new ForbiddenException('Sem permissão');
      }
      (req as any).auth = payload;
      return true;
    }
  }
  return mixin(RequireAuthGuard);
}

