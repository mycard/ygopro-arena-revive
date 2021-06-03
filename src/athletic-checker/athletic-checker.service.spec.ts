import { Test, TestingModule } from '@nestjs/testing';
import { AthleticCheckerService } from './athletic-checker.service';

describe('AthleticCheckerService', () => {
  let service: AthleticCheckerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AthleticCheckerService],
    }).compile();

    service = module.get<AthleticCheckerService>(AthleticCheckerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
