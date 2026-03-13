import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

@Injectable()
export class AuthPasswordService {
  constructor(private readonly configService: ConfigService) {}

  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost:
        this.configService.get<number>('auth.argon2.memoryCost') ?? 65536,
      timeCost: this.configService.get<number>('auth.argon2.timeCost') ?? 3,
      parallelism:
        this.configService.get<number>('auth.argon2.parallelism') ?? 1,
    });
  }

  async verify(hash: string, plainText: string): Promise<boolean> {
    return argon2.verify(hash, plainText);
  }
}
