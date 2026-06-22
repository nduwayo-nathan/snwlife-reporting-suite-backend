import { Controller, Get, Query } from '@nestjs/common';
import { PaymentInstallmentsService } from './payment-installments.service';
import { PremiumQueryParams } from '../share/dto/premium-query-params.dto';

@Controller('api')
export class PaymentInstallmentsController {
  constructor(private readonly service: PaymentInstallmentsService) {}

  @Get('premiums-installments/summary')
  getSummary(@Query() q: PremiumQueryParams) {
    return this.service.getSummary(q);
  }

  @Get('premiums-installments/policy-trend')
  getPolicyTrend(@Query() q: PremiumQueryParams) {
    return this.service.getPolicyTrend(q);
  }

  @Get('premiums-installments/product-summary')
  getProductSummary(@Query() q: PremiumQueryParams) {
    return this.service.getProductSummary(q);
  }

  @Get('premiums-installments/state-summary')
  getStateSummary(@Query() q: PremiumQueryParams) {
    return this.service.getStateSummary(q);
  }

  @Get('premiums-installments/cards')
  getCards(@Query() q: PremiumQueryParams) {
    return this.service.getCards(q);
  }

  @Get('premiums-installments/premiums')
  getPremiums(@Query() q: PremiumQueryParams) {
    return this.service.getPremiums(q);
  }

  @Get('premiums-installments/policies')
  getPolicies(@Query() q: PremiumQueryParams) {
    return this.service.getPolicies(q);
  }

  @Get('premiums-installments/claims')
  getClaims(@Query() q: PremiumQueryParams) {
    return this.service.getClaims(q);
  }
}
