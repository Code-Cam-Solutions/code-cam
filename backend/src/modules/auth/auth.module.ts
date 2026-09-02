import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { Env } from '@config/env.validation';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

/** Duração da sessão. Longa de propósito: o app não tem senha para recuperar. */
const TOKEN_TTL = '30d';

@Module({
  imports: [
    PassportModule,
    // `registerAsync` em vez de `register`: ler `process.env` diretamente aqui
    // acontecia antes da validação de configuração, o que anulava a garantia de
    // que o segredo existe e tem tamanho suficiente.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: TOKEN_TTL },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
