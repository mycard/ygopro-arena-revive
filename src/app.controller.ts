import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { UserInfo } from './entities/mycard/UserInfo';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('users')
  async getUsers(@Query('o') orderByWhat: string) {
    return await this.appService.getUsersRaw(orderByWhat === 'pt');
  }
}
