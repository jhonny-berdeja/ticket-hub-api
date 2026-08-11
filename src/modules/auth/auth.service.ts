import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../../common/database/user/users.repository';
import { RolesRepository } from '../../common/database/role/roles.repository';
import { LoginDto } from './dto/login.dto';
import { ResponseLogin } from './dto/response-login.dto';
import { PayloadJwt } from './payload-jwt';

/** Fixed session lifetime — "remember me" stays decorative for this slice. */
const TOKEN_EXPIRY = '1h';

/** Identical for both "no such user" and "wrong password" — no user enumeration. */
const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

/** ~60-char bcrypt output; well within the `password` column's VARCHAR(100). */
const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly jwtService: JwtService,
  ) {}

  /** Used by `UsersService` when provisioning a new account. */
  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  async login(dto: LoginDto): Promise<ResponseLogin> {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const roleEntities = await this.rolesRepository.findByUserId(user.id);

    const payload = PayloadJwt.builder()
      .withSub(user.id)
      .withEmail(user.email)
      .withRoles(roleEntities.map((role) => role.rol))
      .build();

    const access_token = this.jwtService.sign(payload, {
      expiresIn: TOKEN_EXPIRY,
    });

    return new ResponseLogin(access_token);
  }
}
