import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsPositive, IsString } from "class-validator";

export class PayExpDto {
  @IsInt()
  @IsPositive()
  @ApiProperty({ description: '支付数量' })
  cost: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: '支付名称' })
  name?: string;

  getName() {
    return this.name || 'service';
  }
}
