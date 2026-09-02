import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@infra/prisma/prisma.service';
import type { AuthUser } from '@common/types/authenticated-request';
import type { Env } from '@config/env.validation';

interface JwtPayload {
  sub: string;
  name: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
    });
  }

  /**
   * A assinatura válida prova que o token saiu daqui, não que o usuário ainda
   * existe — uma conta apagada continuaria com token válido por trinta dias.
   * Daí a consulta ao banco a cada requisição.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true },
    });

    if (!user) {
      throw new UnauthorizedException('Sessão inválida. Entre novamente.');
    }

    return { userId: user.id, name: user.name };
  }
}
