import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { verify } from "jsonwebtoken";

type JwtPayload = {
  sub: string;
  username: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: JwtPayload;
    }>();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("未登录或登录已过期");
    }

    const token = authHeader.slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException("服务端 JWT_SECRET 未配置");
    }

    try {
      const payload = verify(token, secret) as JwtPayload;
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("登录状态无效，请重新登录");
    }
  }
}
