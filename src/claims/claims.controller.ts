import { Controller, Get, Query } from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { ClaimQueryParams, ClaimListQueryParams } from '../share/dto/claim-query-params.dto';

@Controller('api/claims')
export class ClaimsController {
  constructor(private readonly service: ClaimsService) {}

  @Get('years')
  getYears() {
    return this.service.getYears();
  }

  @Get('policy-years')
  getPolicyYears(@Query() q: ClaimQueryParams) {
    return this.service.getPolicyYears(q);
  }

  @Get('monthly-summary')
  getMonthlySummary(@Query() q: ClaimQueryParams) {
    return this.service.getMonthlySummary(q);
  }

  @Get('records')
  getRecords(@Query() q: ClaimQueryParams) {
    return this.service.getRecords(q);
  }

  @Get('by-product')
  getByProduct(@Query() q: ClaimQueryParams) {
    return this.service.getByProduct(q);
  }

  @Get('by-status')
  getByStatus(@Query() q: ClaimQueryParams) {
    return this.service.getByStatus(q);
  }

  @Get('by-type')
  getByType(@Query() q: ClaimQueryParams) {
    return this.service.getByType(q);
  }

  @Get('by-installment')
  getByInstallment(@Query() q: ClaimQueryParams) {
    return this.service.getByInstallment(q);
  }

  @Get('cards')
  getCards(@Query() q: ClaimQueryParams) {
    return this.service.getCards(q);
  }

  @Get('list')
  getList(@Query() q: ClaimListQueryParams) {
    return this.service.getList(q);
  }
}
