import {
  HttpException,
  HttpService,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { config } from 'src/config';

export interface MycardUser {
  id: number;
  username: string;
  name: string;
  email: string;
  password_hash: string;
  salt: string;
  active: boolean;
  admin: boolean;
  avatar: string;
  locale: string;
  registration_ip_address: string;
  ip_address: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class AccountService {
  private url = config.accountsUrl + '/authUser';
  constructor(private http: HttpService) {}

  async getUserFromToken(token: string): Promise<MycardUser> {
    try {
      const result = await this.http
        .get<MycardUser & { error?: string }>(this.url, {
          responseType: 'json',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .toPromise();
      if (result.status >= 400) {
        throw new HttpException(result.data?.error, result.status);
      }
      return result.data;
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  async checkToken(token: string) {
    if (typeof token !== 'string') {
      throw new HttpException('Invalid token', 400);
    }
    if (token.startsWith('Bearer ')) {
      token = token.slice(7);
    }
    return this.getUserFromToken(token);
  }
}
