import { Controller, Get, Query } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { ProposalQueryParams } from '../share/dto/proposal-query-params.dto';

@Controller('api/proposals')
export class ProposalsController {
  constructor(private readonly service: ProposalsService) {}

  @Get('years')
  getYears() {
    return this.service.getYears();
  }

  @Get('monthly-summary')
  getMonthlySummary(@Query() q: ProposalQueryParams) {
    return this.service.getMonthlySummary(q);
  }

  @Get('records')
  getRecords(@Query() q: ProposalQueryParams) {
    return this.service.getRecords(q);
  }

  @Get('by-product')
  getByProduct(@Query() q: ProposalQueryParams) {
    return this.service.getByProduct(q);
  }

  @Get('by-status')
  getByStatus(@Query() q: ProposalQueryParams) {
    return this.service.getByStatus(q);
  }

  @Get('cards')
  getCards(@Query() q: ProposalQueryParams) {
    return this.service.getCards(q);
  }
}
