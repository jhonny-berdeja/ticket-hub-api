import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../../shared/database/repositories/users.repository';
import { LoginDto } from './dto/login.dto';

/** Fixed session lifetime — "remember me" stays decorative for this slice. */
const TOKEN_EXPIRY = '1h';

/** Identical for both "no such user" and "wrong password" — no user enumeration. */
const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

export interface LoginResult {
  access_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const access_token = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: TOKEN_EXPIRY },
    );

    return { access_token };
  }
}
