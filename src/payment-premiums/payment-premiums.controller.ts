import { Controller, Get, Query } from '@nestjs/common';
import { PaymentPremiumsService } from './payment-premiums.service';
import { PremiumQueryParams } from '../share/dto/premium-query-params.dto';

@Controller('api')
export class PaymentPremiumsController {
  constructor(private readonly service: PaymentPremiumsService) {}

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

  @Get('premiums-payment/policies')
  getPolicies(@Query() q: PremiumQueryParams) {
    return this.service.getPolicies(q);
  }

  @Get('premiums-payment/claims')
  getClaims(@Query() q: PremiumQueryParams) {
    return this.service.getClaims(q);
  }

  @Get('premiums-payment/premiums')
  getPremiums(@Query() q: PremiumQueryParams) {
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
}
