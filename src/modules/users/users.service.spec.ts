import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from '../../shared/database/entities/user.entity';
import { UsersRepository } from '../../shared/database/repositories/users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

type CreateUserInput = Pick<User, 'name' | 'lastname' | 'email' | 'password'>;

interface MockUsersRepository {
  findByEmail: jest.Mock<Promise<User | null>, [string]>;
  createUser: jest.Mock<Promise<User>, [CreateUserInput]>;
}

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: MockUsersRepository;

  const dto: CreateUserDto = {
    name: 'Ana',
    lastname: 'Perez',
    email: 'ana@example.com',
    password: 'secret1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findByEmail: jest.fn(),
            createUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    usersRepository = module.get(UsersRepository);
  });

  it('hashes the password before persisting and never returns it', async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.createUser.mockImplementation((user) =>
      Promise.resolve({ id: 1, ...user }),
    );

    const result = await service.create(dto);

    expect(usersRepository.createUser).toHaveBeenCalledTimes(1);
    const persisted = usersRepository.createUser.mock.calls[0][0];
    expect(persisted.password).not.toBe(dto.password);
    expect(persisted.password.length).toBeGreaterThan(20);

    expect(result).toEqual({
      id: 1,
      name: dto.name,
      lastname: dto.lastname,
      email: dto.email,
    });
    expect(result).not.toHaveProperty('password');
  });

  it('throws 409 ConflictException when the email already exists', async () => {
    usersRepository.findByEmail.mockResolvedValue({
      id: 1,
      name: 'Existing',
      lastname: 'User',
      email: dto.email,
      password: 'hashed',
    });

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(usersRepository.createUser).not.toHaveBeenCalled();
  });
});
