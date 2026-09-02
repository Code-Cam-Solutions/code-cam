import type { Request } from 'express';

/**
 * Formato do usuário anexado à requisição pela `JwtStrategy.validate`.
 * Manter este contrato em um único lugar evita que cada controller
 * redeclare a forma do `req.user` — e que ela silenciosamente divirja.
 */
export interface AuthUser {
  userId: string;
  name: string;
}

/** Requisição já processada pelo `JwtAuthGuard`, portanto com `user` garantido. */
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
