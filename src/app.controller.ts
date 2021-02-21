import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import express from 'express';
import { AppService } from './app.service';
import { UserInfo } from './entities/mycard/UserInfo';
import { config } from './config';
import {
  AnyFilesInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { IncomingForm } from 'formidable';

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
  async updateActivity(@Body() body: any, @Res() res: express.Response) {
    const code = await this.appService.updateActivity(body);
    res.status(code).json({ code });
  }

  @Get('label')
  async getLabel(@Res() res: express.Response) {
    const value = await this.appService.getSiteConfig('label');
    if (value) {
      res.status(200).json({
        code: 200,
        text: value,
      });
    } else {
      res.status(500).json({
        code: 500,
      });
    }
  }

  @Post('label')
  async updateLabel(
    @Body('labelone') value: string,
    @Res() res: express.Response,
  ) {
    const code = await this.appService.updateSiteConfig('label', value);
    res.status(code).json({ code });
  }

  @Post('adSwitchChange')
  async updateAdvertisementSetting(
    @Body('status') value: string,
    @Res() res: express.Response,
  ) {
    const code = await this.appService.updateSiteConfig('auto_close_ad', value);
    res.status(code).json({ code });
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

  @Get('votes')
  async getVotes(@Query() query: any) {
    const result = await this.appService.getVotes(query);
    return result;
  }

  @Get('vote')
  async getRandomVote(@Query('user') userid: string) {
    if (!userid) {
      return {
        data: 'null',
      };
    }
    const result = await this.appService.getRandomVote(userid);
    return result;
  }
  @Get('deckinfo')
  async getDeckInfo(@Query() query, @Res() res: express.Response) {
    if (!query.name) {
      res.status(404).send('deck name is required!');
    }
    const result = await this.appService.getDeckInfo(query);
    res.status(result.code).json(result);
  }
  @Post('upload')
  uploadFile(@Req() req: express.Request, @Res() res: express.Response) {
    const form = new IncomingForm();
    form.encoding = 'utf-8';
    form.uploadDir = 'upload/';
    form.keepExtensions = true;
    form.maxFieldsSize = 2 * 1024 * 1024;
    form.parse(req, function (err, fields, files) {
      if (err) {
        console.log(err);
        return res.status(500).send('upload image fail!');
      }

      const response = {
        code: 200,
      };
      if (err) {
        response.code = 500;
      } else {
        response.code = 200;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        response.path = files.file.path;
      }

      res.status(response.code).json(response);
    });
  }
  @Get('download/:id')
  downloadFile(@Param('id') filename: string, @Res() res: express.Response) {
    if (!filename) {
      res.status(400).end('Missing filename.');
    }
    const filepath = `upload/${filename}`;
    res.download(filepath, filename);
  }

  @Get('deckdata/:id')
  async getDeckData(
    @Param('id') filename: string,
    @Res() res: express.Response,
  ) {
    if (!filename) {
      res.status(400).end('Missing filename.');
    }
    const deck = await this.appService.getDeckData(filename);
    if (!deck) {
      res.status(404).end('File not found.');
    }
    res.json({ deck });
  }
  @Post('deckdemo')
  async submitDeckDemo(@Body() body: any, @Res() res: express.Response) {
    const code = await this.appService.submitDeckDemo(body);
    res.status(code).json({ code });
  }
  @Post('deckinfo')
  async submitDeckInfo(@Body() body: any, @Res() res: express.Response) {
    const code = await this.appService.submitDeckInfo(body);
    res.status(code).json({ code });
  }
}
