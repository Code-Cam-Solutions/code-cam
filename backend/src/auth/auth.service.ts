import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    // Find or create user by name
    let user = await this.prisma.user.findUnique({
      where: { name: dto.name },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: { name: dto.name },
      });
    }

    const payload = { sub: user.id, name: user.name };
    const token = this.jwtService.sign(payload);

    return {
      userId: user.id,
      name: user.name,
      token,
    };
  }
}
