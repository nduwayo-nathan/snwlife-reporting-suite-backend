import { Controller, Get, Query } from '@nestjs/common';
import { PremiumsListService } from './premiums-list.service';
import { PremiumQueryParams, PremiumListQueryParams } from '../share/dto/premium-query-params.dto';

@Controller('api')
export class PremiumsListController {
  constructor(private readonly service: PremiumsListService) {}

  @Get('premiums-list')
  getPremiumsList(@Query() q: PremiumQueryParams) {
    return this.service.getRecords(q);
  }

  @Get('premiums-payment/monthly-summary')
  getMonthlySummary(@Query() q: PremiumQueryParams) {
    return this.service.getMonthlySummary(q);
  }

  @Get('premiums-payment/product-summary')
  getProductSummary(@Query() q: PremiumQueryParams) {
    return this.service.getProductSummary(q);
  }

  @Get('premiums-payment/state-summary')
  getStateSummary(@Query() q: PremiumQueryParams) {
    return this.service.getStateSummary(q);
  }

  @Get('premiums-payment/years')
  getAvailableYears() {
    return this.service.getAvailableYears();
  }

  @Get('premiums-payment/policies-summary')
  getPoliciesSummary(@Query() q: PremiumQueryParams) {
    return this.service.getPoliciesSummary(q);
  }

  @Get('premiums-payment/records')
  getRecords(@Query() q: PremiumQueryParams) {
    return this.service.getRecords(q);
  }

  @Get('premiums-payment/by-product')
  getByProduct(@Query() q: PremiumQueryParams) {
    return this.service.getByProduct(q);
  }

  @Get('premiums-payment/by-state')
  getByState(@Query() q: PremiumQueryParams) {
    return this.service.getByState(q);
  }

  @Get('premiums-payment/cards')
  getCards(@Query() q: PremiumQueryParams) {
    return this.service.getCards(q);
  }

  @Get('premiums-payment/list')
  getList(@Query() q: PremiumListQueryParams) {
    return this.service.getList(q);
  }
}
