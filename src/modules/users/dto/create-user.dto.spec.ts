import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

const VALID_PAYLOAD = {
  name: 'Ana',
  lastname: 'Perez',
  email: 'ana@example.com',
  password: 'secret1',
};

async function validatePayload(overrides: Partial<typeof VALID_PAYLOAD>) {
  const dto = plainToInstance(CreateUserDto, {
    ...VALID_PAYLOAD,
    ...overrides,
  });
  return validate(dto);
}

describe('CreateUserDto', () => {
  it('accepts a payload within all column limits', async () => {
    const errors = await validatePayload({});
    expect(errors).toHaveLength(0);
  });

  it('rejects a name longer than 15 characters', async () => {
    const errors = await validatePayload({ name: 'a'.repeat(16) });
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('rejects a lastname longer than 15 characters', async () => {
    const errors = await validatePayload({ lastname: 'a'.repeat(16) });
    expect(errors.some((e) => e.property === 'lastname')).toBe(true);
  });

  it('rejects a malformed email', async () => {
    const errors = await validatePayload({ email: 'not-an-email' });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('rejects an email longer than 30 characters', async () => {
    const longEmail = `${'a'.repeat(25)}@ab.com`; // 32 chars, valid format
    const errors = await validatePayload({ email: longEmail });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('rejects a password shorter than 6 characters', async () => {
    const errors = await validatePayload({ password: 'abc12' });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('accepts a password exactly 6 characters', async () => {
    const errors = await validatePayload({ password: 'abcdef' });
    expect(errors).toHaveLength(0);
  });
});
