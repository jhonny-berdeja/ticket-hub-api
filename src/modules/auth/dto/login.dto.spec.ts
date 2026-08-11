import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

const VALID_PAYLOAD = {
  email: 'ana@example.com',
  password: 'secret1',
};

async function validatePayload(overrides: Partial<typeof VALID_PAYLOAD>) {
  const dto = plainToInstance(LoginDto, {
    ...VALID_PAYLOAD,
    ...overrides,
  });
  return validate(dto);
}

describe('LoginDto', () => {
  it('accepts a valid email and password', async () => {
    const errors = await validatePayload({});
    expect(errors).toHaveLength(0);
  });

  it('rejects a missing email', async () => {
    const errors = await validatePayload({ email: undefined });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('rejects a malformed email', async () => {
    const errors = await validatePayload({ email: 'not-an-email' });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('rejects a missing password', async () => {
    const errors = await validatePayload({ password: undefined });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('rejects an empty password', async () => {
    const errors = await validatePayload({ password: '' });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });
});
