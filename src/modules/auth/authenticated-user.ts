/**
 * Decoded shape of a token issued by auth-api -- what `JwtAuthGuard`
 * verifies and attaches to `request.user`, and what `RolesGuard`/
 * `CurrentUser()` read from there. Mirrors auth-api's own
 * `AuthenticatedUser`/`AppsPayload` exactly (see
 * `auth-api/src/common/jwt/apps-payload.ts` and
 * `authenticated-user.ts`) -- roles are scoped to the single
 * application (`ticket-hub`) the caller logged into, not a flat list
 * like the old locally-issued `PayloadJwt`.
 */
export interface RolePayload {
  id: number;
  name: string;
  description: string;
}

export interface ApplicationPayload {
  id: number;
  name: string;
  description: string;
  roles: RolePayload[];
}

export interface AuthenticatedUser {
  sub: number;
  email: string;
  apps: {
    application: ApplicationPayload;
  };
}
