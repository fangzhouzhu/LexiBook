import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { compare, hash } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { PrismaService } from "./prisma.service";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private signToken(user: { id: string; username: string }) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new BadRequestException("服务端 JWT_SECRET 未配置");
    }
    return sign({ sub: user.id, username: user.username }, secret, { expiresIn: "7d" });
  }

  async register(username: string, password: string) {
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      throw new BadRequestException("用户名和密码不能为空");
    }
    if (password.length < 6) {
      throw new BadRequestException("密码至少 6 位");
    }

    const existed = await this.prisma.user.findUnique({
      where: { username: normalizedUsername }
    });
    if (existed) {
      throw new BadRequestException("用户名已存在");
    }

    const passwordHash = await hash(password, 10);
    const user = await this.prisma.user.create({
      data: { username: normalizedUsername, passwordHash }
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt
      },
      token: this.signToken(user)
    };
  }

  async login(username: string, password: string) {
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      throw new BadRequestException("用户名和密码不能为空");
    }

    const user = await this.prisma.user.findUnique({
      where: { username: normalizedUsername }
    });

    if (!user) {
      throw new UnauthorizedException("用户名或密码错误");
    }

    const ok = await compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("用户名或密码错误");
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt
      },
      token: this.signToken(user)
    };
  }

  async resetPassword(username: string, password: string) {
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      throw new BadRequestException("用户名和新密码不能为空");
    }
    if (password.length < 6) {
      throw new BadRequestException("密码至少 6 位");
    }

    const user = await this.prisma.user.findUnique({
      where: { username: normalizedUsername }
    });

    if (!user) {
      throw new BadRequestException("用户不存在");
    }

    const passwordHash = await hash(password, 10);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    return {
      user: {
        id: updated.id,
        username: updated.username,
        createdAt: updated.createdAt
      },
      token: this.signToken(updated)
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new UnauthorizedException("用户不存在");
    }
    return {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt
    };
  }
}
