import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PayloadJwt } from '../payload-jwt';
import { IS_PUBLIC_KEY } from './public.decorator';

const MISSING_TOKEN_MESSAGE = 'Missing or malformed bearer token';
const INVALID_TOKEN_MESSAGE = 'Invalid or expired token';

/**
 * Registered globally (see AppModule's APP_GUARD providers) — every
 * route authenticates by default. `@Public()` is the one explicit
 * escape hatch (used only by POST /auth/login, the sole route that
 * cannot require a token since it's what issues one). Verifies the
 * `Authorization: Bearer <token>` header against JWT_SECRET and
 * attaches the decoded payload to `request.user` for `RolesGuard`
 * (also global) and handlers to read afterward.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException(MISSING_TOKEN_MESSAGE);
    }

    const payload = await verifyToken(this.jwtService, token);
    if (!payload) {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    (request as Request & { user: PayloadJwt }).user = payload;
    return true;
  }
}

function extractBearerToken(request: Request): string | undefined {
  const header = request.headers.authorization;
  if (!header) {
    return undefined;
  }

  const [type, token] = header.split(' ');
  return type === 'Bearer' && token ? token : undefined;
}

async function verifyToken(
  jwtService: JwtService,
  token: string,
): Promise<PayloadJwt | null> {
  try {
    return await jwtService.verifyAsync<PayloadJwt>(token);
  } catch (error) {
    console.error('Failed to verify JWT', error);
    return null;
  }
}
