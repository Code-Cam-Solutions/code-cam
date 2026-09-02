import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthUser, AuthenticatedRequest } from '@common/types/authenticated-request';

/**
 * Injeta o usuário autenticado direto no parâmetro do handler.
 *
 * Substitui o par `@Request() req: AuthenticatedRequest` + `req.user.userId`
 * que se repetia em todo controller. Além de encurtar, tira do controller a
 * decisão de onde o usuário mora na requisição: se a estratégia de autenticação
 * mudar, muda aqui e em nenhum outro lugar.
 *
 * Só faz sentido em rota protegida pelo `JwtAuthGuard` — sem o guard, `user`
 * não existe na requisição.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    return context.switchToHttp().getRequest<AuthenticatedRequest>().user;
  },
);
