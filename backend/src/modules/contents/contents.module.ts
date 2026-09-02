import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module';
import { ContentsController } from './contents.controller';
import { ContentsService } from './contents.service';

@Module({
  // O guard de autenticação é resolvido no injetor deste módulo; importar
  // AuthModule deixa essa dependência declarada em vez de implícita.
  imports: [AuthModule],
  controllers: [ContentsController],
  providers: [ContentsService],
})
export class ContentsModule {}
