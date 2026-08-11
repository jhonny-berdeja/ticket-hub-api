import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { User } from '../../shared/database/entities/user.entity';
import { UsersRepository } from '../../shared/database/repositories/users.repository';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

interface MockUsersRepository {
  findByEmail: jest.Mock<Promise<User | null>, [string]>;
  createUser: jest.Mock<Promise<User>, [unknown]>;
}

interface MockJwtService {
  sign: jest.Mock<string, [Record<string, unknown>, unknown?]>;
}

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: MockUsersRepository;
  let jwtService: MockJwtService;

  const dto: LoginDto = {
    email: 'ana@example.com',
    password: 'secret1',
  };

  const buildUser = async (): Promise<User> => ({
    id: 1,
    name: 'Ana',
    lastname: 'Perez',
    email: dto.email,
    password: await bcrypt.hash(dto.password, 10),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: {
            findByEmail: jest.fn(),
            createUser: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'signed.jwt.token'),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersRepository = module.get(UsersRepository);
    jwtService = module.get(JwtService);
  });

  it('returns a signed access token for valid credentials', async () => {
    const user = await buildUser();
    usersRepository.findByEmail.mockResolvedValue(user);

    const result = await service.login(dto);

    expect(result).toEqual({ access_token: 'signed.jwt.token' });
  });

  it('signs the JWT with the user id/email and a 1-hour expiry, never the password', async () => {
    const user = await buildUser();
    usersRepository.findByEmail.mockResolvedValue(user);

    await service.login(dto);

    expect(jwtService.sign).toHaveBeenCalledTimes(1);
    const [payload, options] = jwtService.sign.mock.calls[0];
    expect(payload).toMatchObject({ sub: user.id, email: user.email });
    expect(payload).not.toHaveProperty('password');
    expect(options).toEqual(expect.objectContaining({ expiresIn: '1h' }));
  });

  it('throws the same generic UnauthorizedException for an unknown email', async () => {
    usersRepository.findByEmail.mockResolvedValue(null);

    await expect(service.login(dto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('throws the same generic UnauthorizedException for a wrong password', async () => {
    const user = await buildUser();
    usersRepository.findByEmail.mockResolvedValue(user);

    await expect(
      service.login({ email: dto.email, password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.login({ email: dto.email, password: 'wrong-password' }),
    ).rejects.toThrow('Invalid credentials');
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('produces the identical error message for unknown-email and wrong-password paths', async () => {
    usersRepository.findByEmail.mockResolvedValueOnce(null);
    let unknownEmailMessage: string | undefined;
    try {
      await service.login(dto);
    } catch (err) {
      unknownEmailMessage = (err as Error).message;
    }

    const user = await buildUser();
    usersRepository.findByEmail.mockResolvedValueOnce(user);
    let wrongPasswordMessage: string | undefined;
    try {
      await service.login({ email: dto.email, password: 'wrong-password' });
    } catch (err) {
      wrongPasswordMessage = (err as Error).message;
    }

    expect(unknownEmailMessage).toBe(wrongPasswordMessage);
  });
});
