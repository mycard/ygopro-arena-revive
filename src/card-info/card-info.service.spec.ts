import { Test, TestingModule } from '@nestjs/testing';
import { CardInfoService } from './card-info.service';

describe('CardInfoService', () => {
  let service: CardInfoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CardInfoService],
    }).compile();

    service = module.get<CardInfoService>(CardInfoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
