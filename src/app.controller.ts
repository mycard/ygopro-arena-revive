import { Controller, Get, Query, Res } from '@nestjs/common';
import express from 'express';
import { AppService } from './app.service';
import { UserInfo } from './entities/mycard/UserInfo';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('users')
  async getUsers(@Query('o') orderByWhat: string) {
    return await this.appService.getUsersRaw(orderByWhat === 'pt');
  }

  @Get('cardinfo')
  async getCardInfo(
    @Query('lang') language: string,
    @Query('id') id: string,
    @Res() res: express.Response,
  ) {
    const cardId = parseInt(id);
    if (!cardId) {
      res.status(404).end('card id is required!');
      return;
    }
    const result = await this.appService.getCardInfo(cardId, language);
    if (!result) {
      res.status(404).end('card info not found!');
      return;
    }
    res.json(result);
  }

  @Get('report')
  async getReport(
    @Query('from_date') fromDate: string,
    @Query('to_date') toDate: string,
  ) {
    return await this.appService.getReport(fromDate, toDate);
  }
}
