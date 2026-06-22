import { Controller, Get, Query } from '@nestjs/common';
import { ClaimsPaymentService } from './claims-payment.service';
import { ClaimPaymentQueryParams } from '../share/dto/claim-query-params.dto';

@Controller('api/claims-payment')
export class ClaimsPaymentController {
  constructor(private readonly service: ClaimsPaymentService) {}

  @Get('years')
  getYears() {
    return this.service.getYears();
  }

  @Get('policy-years')
  getPolicyYears(@Query() q: ClaimPaymentQueryParams) {
    return this.service.getPolicyYears(q);
  }

  @Get('monthly-summary')
  getMonthlySummary(@Query() q: ClaimPaymentQueryParams) {
    return this.service.getMonthlySummary(q);
  }

  @Get('records')
  getRecords(@Query() q: ClaimPaymentQueryParams) {
    return this.service.getRecords(q);
  }

  @Get('by-product')
  getByProduct(@Query() q: ClaimPaymentQueryParams) {
    return this.service.getByProduct(q);
  }

  @Get('by-status')
  getByStatus(@Query() q: ClaimPaymentQueryParams) {
    return this.service.getByStatus(q);
  }

  @Get('by-type')
  getByType(@Query() q: ClaimPaymentQueryParams) {
    return this.service.getByType(q);
  }

  @Get('cards')
  getCards(@Query() q: ClaimPaymentQueryParams) {
    return this.service.getCards(q);
  }

  @Get('list')
  getList(@Query() q: ClaimPaymentQueryParams) {
    return this.service.getList(q);
  }

  @Get('related-premiums')
  getRelatedPremiums(@Query() q: ClaimPaymentQueryParams) {
    return this.service.getRelatedPremiums(q);
  }
}
