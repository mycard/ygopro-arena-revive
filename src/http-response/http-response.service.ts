import { HttpException, Injectable } from '@nestjs/common';
import { CodeResponseDto } from '../dto/CodeResponse.dto';

@Injectable()
export class HttpResponseService {
  async handlePostCodeResponse(codePromise: Promise<number>) {
    const code = await codePromise;
    const codeDto = new CodeResponseDto(code);
    if (code >= 400) {
      throw new HttpException(codeDto, code);
    }
    return codeDto;
  }
}
