import { Controller, Get, Query } from '@nestjs/common';
import { PoliciesListService } from './policies-list.service';
import { PolicyQueryParams } from '../share/dto/policy-query-params.dto';

@Controller('api/policies-list')
export class PoliciesListController {
  constructor(private readonly service: PoliciesListService) {}

  @Get('policies')
  getPolicies(@Query() q: PolicyQueryParams) {
    return this.service.getPolicies(q);
  }

  @Get('cards')
  getCards(@Query() q: PolicyQueryParams) {
    return this.service.getCards(q);
  }
}
