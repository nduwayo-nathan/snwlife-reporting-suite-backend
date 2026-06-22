import { Controller, Get, Query } from '@nestjs/common';
import { ClaimsInstallmentsService } from './claims-installments.service';
import { ClaimInstallmentQueryParams } from '../share/dto/claim-query-params.dto';

@Controller('api/claims-installment')
export class ClaimsInstallmentsController {
  constructor(private readonly service: ClaimsInstallmentsService) {}

  @Get('policy-years')
  getPolicyYears(@Query() q: ClaimInstallmentQueryParams) {
    return this.service.getPolicyYears(q);
  }

  @Get('by-installment')
  getByInstallment(@Query() q: ClaimInstallmentQueryParams) {
    return this.service.getByInstallment(q);
  }

  @Get('by-product')
  getByProduct(@Query() q: ClaimInstallmentQueryParams) {
    return this.service.getByProduct(q);
  }

  @Get('by-status')
  getByStatus(@Query() q: ClaimInstallmentQueryParams) {
    return this.service.getByStatus(q);
  }

  @Get('cards')
  getCards(@Query() q: ClaimInstallmentQueryParams) {
    return this.service.getCards(q);
  }

  @Get('policies')
  getPolicies(@Query() q: ClaimInstallmentQueryParams) {
    return this.service.getPolicies(q);
  }

  @Get('claims')
  getClaims(@Query() q: ClaimInstallmentQueryParams) {
    return this.service.getClaims(q);
  }

  @Get('related-premiums')
  getRelatedPremiums(@Query() q: ClaimInstallmentQueryParams) {
    return this.service.getRelatedPremiums(q);
  }
}
