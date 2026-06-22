import { Controller, Get, Query } from '@nestjs/common';
import { ProposalService } from './proposal.service';
import { ProposalQueryParams } from '../share/dto/proposal-query-params.dto';

@Controller('api/proposals')
export class ProposalController {
  constructor(private readonly service: ProposalService) {}

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
