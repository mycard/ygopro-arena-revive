import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import express from 'express';
import { AppService } from './app.service';
import { UserInfo } from './entities/mycard/UserInfo';
import { config } from './config';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { HttpResponseService } from './http-response/http-response.service';
import { CodeResponseDto } from './dto/CodeResponse.dto';
import multer from 'multer';
import cryptoRandomString from 'crypto-random-string';
import { join } from 'path';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileUploadDto } from './dto/FileUploadDto';

@Controller('api')
@ApiTags('arena')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly httpResponseService: HttpResponseService,
  ) {}

  @Post('score')
  async postScore(@Body() body: any, @Body('accesskey') accessKey) {
    if (accessKey !== config.accessKey) {
      throw new ForbiddenException({
        msg: 'accesskey error',
      });
    }
    const message = await this.appService.postScore(body);
    if (message) {
      throw new NotFoundException({ msg: message });
    } else {
      return {
        msg: 'success',
      };
    }
  }

  @Get('users')
  async getUsers(@Query('o') orderByWhat: string) {
    return await this.appService.getUsers(orderByWhat === 'pt');
  }

  @Get('cardinfo')
  async getCardInfo(@Query('lang') language: string, @Query('id') id: string) {
    const cardId = parseInt(id);
    if (!cardId) {
      throw new BadRequestException('card id is required!');
    }
    const result = await this.appService.getCardInfo(cardId, language);
    if (!result) {
      throw new NotFoundException('card not found.');
    }
    return result;
  }

  @Get('report')
  async getReport(
    @Query('from_date') fromDate: string,
    @Query('to_date') toDate: string,
  ) {
    return await this.appService.getReport(fromDate, toDate);
  }

  @Post('activity')
  async updateActivity(@Body() body: any): Promise<CodeResponseDto> {
    return this.httpResponseService.handlePostCodeResponse(
      this.appService.updateActivity(body),
    );
  }

  @Get('label')
  async getLabel() {
    const value = await this.appService.getSiteConfig('label');
    if (value != null) {
      return {
        code: 200,
        text: value,
      };
    } else {
      throw new InternalServerErrorException(new CodeResponseDto(500));
    }
  }

  @Post('label')
  async updateLabel(@Body('labelone') value: string) {
    return this.httpResponseService.handlePostCodeResponse(
      this.appService.updateSiteConfig('label', value),
    );
  }

  @Post('adSwitchChange')
  async updateAdvertisementSetting(@Body('status') value: string) {
    return this.httpResponseService.handlePostCodeResponse(
      this.appService.updateSiteConfig('auto_close_ad', value),
    );
  }

  @Post('votes')
  async updateVotes(@Body() body: any) {
    return this.httpResponseService.handlePostCodeResponse(
      this.appService.updateVotes(body),
    );
  }

  @Post('voteStatus')
  async updateVoteStatus(@Body() body: any) {
    return this.httpResponseService.handlePostCodeResponse(
      this.appService.updateVoteStatus(body),
    );
  }

  @Post('submitVote')
  async submitVote(@Body() body: any) {
    return this.httpResponseService.handlePostCodeResponse(
      this.appService.submitVote(body),
    );
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
  async getDeckInfo(@Query() query) {
    if (!query.name) {
      throw new NotFoundException('deck name is required!');
    }
    return await this.appService.getDeckInfo(query);
  }
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '要上传的文件',
    type: FileUploadDto,
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, join(__dirname, '..', 'upload'));
        },
        filename: (req, file, cb) => {
          const customFileName = cryptoRandomString({
              length: 20,
              type: 'alphanumeric',
            }),
            fileExtension = file.originalname.split('.')[1]; // get file extension from original file name
          cb(null, customFileName + '.' + fileExtension);
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
      preservePath: true,
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new InternalServerErrorException(new CodeResponseDto(500));
    }
    return {
      code: 200,
      path: file.path,
    };
  }

  @Get('deckdata/:id')
  async getDeckData(@Param('id') filename: string) {
    if (!filename) {
      throw new BadRequestException('Missing filename.');
    }
    const deck = await this.appService.getDeckData(filename);
    if (!deck) {
      throw new NotFoundException('File not found.');
    }
    return { deck };
  }
  @Post('deckdemo')
  async submitDeckDemo(@Body() body: any) {
    return this.httpResponseService.handlePostCodeResponse(
      this.appService.submitDeckDemo(body),
    );
  }
  @Post('deckinfo')
  async submitDeckInfo(@Body() body: any) {
    return this.httpResponseService.handlePostCodeResponse(
      this.appService.submitDeckInfo(body),
    );
  }
  @Get('history')
  async getBattleHistory(@Query() query: any) {
    return await this.appService.getBattleHistory(query);
  }
  @Get('user')
  async getUser(@Query('username') username: string) {
    return await this.appService.getUser(username);
  }
  @Post('ads')
  async updateAds(@Body() body: any) {
    return this.httpResponseService.handlePostCodeResponse(
      this.appService.updateAds(body),
    );
  }
  @Get('ads')
  async getAds(@Query() query: any) {
    return await this.appService.getAds(query);
  }
  @Get('getAd')
  async getRandomAd(@Query('type') type: string) {
    return await this.appService.getRandomAd(type);
  }
  @Post('adsStatus')
  async updateAdsStatus(@Body() body: any) {
    return this.httpResponseService.handlePostCodeResponse(
      this.appService.updateAdsStatus(body),
    );
  }
  @Post('adClick')
  async adClick(@Body('id', ParseIntPipe) id: number) {
    return this.httpResponseService.handlePostCodeResponse(
      this.appService.increaseAds(id, 'clk'),
    );
  }
  @Post('adImpl')
  async adImpl(@Body('id', ParseIntPipe) id: number) {
    return this.httpResponseService.handlePostCodeResponse(
      this.appService.increaseAds(id, 'impl'),
    );
  }
  @Get('firstwin')
  async getFirstWinActivity(@Query('username') username: string) {
    return await this.appService.getFirstWinActivity(username);
  }
}
