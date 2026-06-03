import { Controller, Get, Query } from '@nestjs/common';
import { PremiumsService } from './premiums.service';
import { PremiumQueryParams, PremiumListQueryParams } from '../share/dto/premium-query-params.dto';

@Controller('api/premiums')
export class PremiumsController {
  constructor(private readonly service: PremiumsService) {}

  @Get('years')
  getYears() {
    return this.service.getYears();
  }

  @Get('monthly-summary')
  getMonthlySummary(@Query() q: PremiumQueryParams) {
    return this.service.getMonthlySummary(q);
  }

  @Get('records')
  getRecords(@Query() q: PremiumQueryParams) {
    return this.service.getRecords(q);
  }

  @Get('by-product')
  getByProduct(@Query() q: PremiumQueryParams) {
    return this.service.getByProduct(q);
  }

  @Get('by-state')
  getByState(@Query() q: PremiumQueryParams) {
    return this.service.getByState(q);
  }

  @Get('cards')
  getCards(@Query() q: PremiumQueryParams) {
    return this.service.getCards(q);
  }

  @Get('list')
  getList(@Query() q: PremiumListQueryParams) {
    return this.service.getList(q);
  }
}
