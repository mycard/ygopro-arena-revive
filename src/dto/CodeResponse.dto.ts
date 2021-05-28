import { ApiProperty } from '@nestjs/swagger';

export class CodeResponseDto {
  @ApiProperty({ description: '状态码' })
  code: number;
  @ApiProperty({ description: '是否成功' })
  success: boolean;
  constructor(code: number) {
    this.success = code < 400;
    this.code = code;
  }
}
