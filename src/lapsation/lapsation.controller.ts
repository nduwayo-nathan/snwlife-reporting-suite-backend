import { Controller, Get, Query } from '@nestjs/common';
import { LapsationService } from './lapsation.service';
import { PremiumQueryParams } from '../share/dto/premium-query-params.dto';

@Controller('api')
export class LapsationController {
  constructor(private readonly service: LapsationService) {}

  @Get('payment/lapsation/monthly-summary')
  getMonthlySummary(@Query() q: PremiumQueryParams) {
    return this.service.getMonthlySummary(q);
  }

  @Get('payment/lapsation/product-summary')
  getProductSummary(@Query() q: PremiumQueryParams) {
    return this.service.getProductSummary(q);
  }

  @Get('payment/lapsation/state-summary')
  getStateSummary(@Query() q: PremiumQueryParams) {
    return this.service.getStateSummary(q);
  }

  @Get('payment/lapsation/policies')
  getPolicies(@Query() q: PremiumQueryParams) {
    return this.service.getPolicies(q);
  }

  @Get('payment/lapsation/cards')
  getCards(@Query() q: PremiumQueryParams) {
    return this.service.getCards(q);
  }

  @Get('payment/lapsation/missed-months')
  getMissedMonths(@Query() q: PremiumQueryParams) {
    return this.service.getMissedMonths(q);
  }
}
