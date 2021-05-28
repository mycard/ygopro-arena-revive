import { Test, TestingModule } from '@nestjs/testing';
import { HttpResponseService } from './http-response.service';

describe('HttpResponseService', () => {
  let service: HttpResponseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpResponseService],
    }).compile();

    service = module.get<HttpResponseService>(HttpResponseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
