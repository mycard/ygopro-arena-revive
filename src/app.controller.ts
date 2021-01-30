import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import express from 'express';
import { AppService } from './app.service';
import { UserInfo } from './entities/mycard/UserInfo';
import { config } from './config';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('score')
  async postScore(
    @Body() body: any,
    @Body('accesskey') accessKey,
    @Res() res: express.Response,
  ) {
    if (accessKey !== config.accessKey) {
      return res.status(403).json({
        msg: 'accesskey error',
      });
    }
    const message = await this.appService.postScore(body);
    if (message) {
      res.status(404).json({
        msg: message,
      });
    } else {
      res.json({
        msg: 'success',
      });
    }
  }

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

  @Post('activity')
  async updateActivity(@Body() body: any) {
    return await this.appService.updateActivity(body);
  }

  @Post('votes')
  async updateVotes(@Body() body: any, @Res() res: express.Response) {
    const code = await this.appService.updateVotes(body);
    res.status(code).json({ code });
  }

  @Post('voteStatus')
  async updateVoteStatus(@Body() body: any, @Res() res: express.Response) {
    const code = await this.appService.updateVoteStatus(body);
    res.status(code).json({ code });
  }

  @Post('submitVote')
  async submitVote(@Body() body: any, @Res() res: express.Response) {
    const code = await this.appService.submitVote(body);
    res.status(code).json({ code });
  }
}
