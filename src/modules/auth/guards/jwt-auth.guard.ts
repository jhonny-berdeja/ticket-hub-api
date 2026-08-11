import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PayloadJwt } from '../payload-jwt';

const MISSING_TOKEN_MESSAGE = 'Missing or malformed bearer token';
const INVALID_TOKEN_MESSAGE = 'Invalid or expired token';

/**
 * Verifies the `Authorization: Bearer <token>` header against JWT_SECRET
 * and attaches the decoded payload to `request.user` for downstream
 * guards/handlers. Must run before `RolesGuard` in `@UseGuards(...)` —
 * `RolesGuard` reads `request.user`, which only exists once this guard
 * has run.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
