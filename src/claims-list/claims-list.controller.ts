import { Controller, Get, Query } from '@nestjs/common';
import { ClaimsListService } from './claims-list.service';
import { ClaimPaymentQueryParams } from '../share/dto/claim-query-params.dto';

@Controller('api')
export class ClaimsListController {
  constructor(private readonly service: ClaimsListService) {}

  @Get('claims-list')
  getClaimsList(@Query() q: ClaimPaymentQueryParams) {
    return this.service.getList(q);
  }
}
