import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { PayloadJwt } from '../payload-jwt';

/** Reads the payload `JwtAuthGuard` already attached to `request.user` — never re-verifies the token itself. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PayloadJwt => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: PayloadJwt }>();
    return request.user;
  },
);
