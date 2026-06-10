import { Controller, Get, Query } from '@nestjs/common';
import { PremiumsService } from './premiums.service';
import { PremiumQueryParams, PremiumListQueryParams } from '../share/dto/premium-query-params.dto';

@Controller('api')
export class PremiumsController {
  constructor(private readonly service: PremiumsService) {}

  @Get('premiums/monthly-summary')
  getMonthlySummary(@Query() q: PremiumQueryParams) {
    return this.service.getMonthlySummary(q);
  }

  @Get('premiums/product-summary')
  getProductSummary(@Query() q: PremiumQueryParams) {
    return this.service.getProductSummary(q);
  }

  @Get('premiums/state-summary')
  getStateSummary(@Query() q: PremiumQueryParams) {
    return this.service.getStateSummary(q);
  }

  @Get('premiums/years')
  getAvailableYears() {
    return this.service.getAvailableYears();
  }

  @Get('premiums/policies-summary')
  getPoliciesSummary(@Query() q: PremiumQueryParams) {
    return this.service.getPoliciesSummary(q);
  }

  @Get('premiums/records')
  getRecords(@Query() q: PremiumQueryParams) {
    return this.service.getRecords(q);
  }

  @Get('premiums/by-product')
  getByProduct(@Query() q: PremiumQueryParams) {
    return this.service.getByProduct(q);
  }

  @Get('premiums/by-state')
  getByState(@Query() q: PremiumQueryParams) {
    return this.service.getByState(q);
  }

  @Get('premiums/cards')
  getCards(@Query() q: PremiumQueryParams) {
    return this.service.getCards(q);
  }

  @Get('premiums/list')
  getList(@Query() q: PremiumListQueryParams) {
    return this.service.getList(q);
  }
}
