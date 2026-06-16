import { Controller, Get, Query } from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { ClaimPaymentQueryParams, ClaimInstallmentQueryParams } from '../share/dto/claim-query-params.dto';

@Controller('api')
export class ClaimsListController {
  constructor(private readonly service: ClaimsService) {}

  @Get('claims-list')
  getClaimsList(@Query() q: ClaimPaymentQueryParams) {
    return this.service.getList(q);
  }
}

@Controller('api/claims-payment')
export class ClaimsController {
  constructor(private readonly service: ClaimsService) {}

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
}

@Controller('api/claims-installment')
export class ClaimsInstallmentController {
  constructor(private readonly service: ClaimsService) {}

  @Get('policy-years')
  getPolicyYears(@Query() q: ClaimInstallmentQueryParams) {
    return this.service.getPolicyYearsForInstallment(q);
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
    return this.service.getPoliciesByInstallment(q);
  }

  @Get('claims')
  getClaims(@Query() q: ClaimInstallmentQueryParams) {
    return this.service.getClaimsByInstallment(q);
  }
}
