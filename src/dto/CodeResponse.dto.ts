import { ApiProperty } from '@nestjs/swagger';

export class CodeResponseDto {
  @ApiProperty({ description: '状态码' })
  code: number;
  @ApiProperty({ description: '是否成功' })
  success: boolean;
  @ApiProperty({ description: '错误信息' })
  message?: string;
  constructor(code: number, message?: string) {
    this.success = code < 400;
    this.code = code;
    this.message = message;
  }
}
