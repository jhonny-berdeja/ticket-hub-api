import { createPublicKey, type KeyObject } from 'crypto';
import { TEST_KID, TEST_PUBLIC_KEY } from './test-jwt-keys';

/**
 * Stands in for the real `JwksClientService` in e2e specs: same
 * `getKey(kid)` shape, but returns the one test key synchronously
 * instead of polling auth-api over the network (there's nothing at
 * `AUTH_API_URL` to poll in this environment). Registered via
 * `.overrideProvider(JwksClientService).useValue(...)` in
 * `bootstrap-test-app.ts`.
 */
export class JwksClientServiceStub {
  private readonly key: KeyObject = createPublicKey(TEST_PUBLIC_KEY);

  getKey(kid: string): KeyObject | undefined {
    return kid === TEST_KID ? this.key : undefined;
  }
}
