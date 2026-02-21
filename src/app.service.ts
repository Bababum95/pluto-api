import { Injectable } from '@nestjs/common';

import { RateService } from './rate/rate.service';

@Injectable()
export class AppService {
  constructor(private readonly rateService: RateService) {}

  health() {
    void this.rateService.ensureFreshRates();

    return { status: 'ok' };
  }
}
