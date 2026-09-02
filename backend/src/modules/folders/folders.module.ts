import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';

@Module({
  // O guard de autenticação é resolvido no injetor deste módulo; importar
  // AuthModule deixa essa dependência declarada em vez de implícita.
  imports: [AuthModule],
  controllers: [FoldersController],
  providers: [FoldersService],
})
export class FoldersModule {}
