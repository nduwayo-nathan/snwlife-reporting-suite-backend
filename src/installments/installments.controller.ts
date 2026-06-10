import { Controller, Get, Query } from '@nestjs/common';
import { InstallmentsService } from './installments.service';
import { PremiumQueryParams } from '../share/dto/premium-query-params.dto';

@Controller('api')
export class InstallmentsController {
  constructor(private readonly service: InstallmentsService) {}

  @Get('installments/summary')
  getSummary(@Query() q: PremiumQueryParams) {
    return this.service.getSummary(q);
  }

  @Get('installments/policy-trend')
  getPolicyTrend(@Query() q: PremiumQueryParams) {
    return this.service.getPolicyTrend(q);
  }

  @Get('installments/product-summary')
  getProductSummary(@Query() q: PremiumQueryParams) {
    return this.service.getProductSummary(q);
  }

  @Get('installments/state-summary')
  getStateSummary(@Query() q: PremiumQueryParams) {
    return this.service.getStateSummary(q);
  }

  @Get('installments/cards')
  getCards(@Query() q: PremiumQueryParams) {
    return this.service.getCards(q);
  }

  @Get('installments/premiums')
  getPremiums(@Query() q: PremiumQueryParams) {
    return this.service.getPremiums(q);
  }

  @Get('installments/policies')
  getPolicies(@Query() q: PremiumQueryParams) {
    return this.service.getPolicies(q);
  }
}
