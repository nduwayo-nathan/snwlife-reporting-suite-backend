import { Controller, Get, Query } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { PolicyQueryParams } from '../share/dto/policy-query-params.dto';

@Controller('api/policies')
export class PoliciesController {
  constructor(private readonly service: PoliciesService) {}

  @Get('years')
  getYears() {
    return this.service.getYears();
  }

  @Get()
  getPolicies(@Query() q: PolicyQueryParams) {
    return this.service.getPolicies(q);
  }

  @Get('installments')
  getInstallments(@Query() q: PolicyQueryParams) {
    return this.service.getInstallments(q);
  }
}
