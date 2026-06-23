import { Controller, Get, Query } from '@nestjs/common';
import { ClaimsListService } from './claims-list.service';
import { ClaimPaymentQueryParams } from '../share/dto/claim-query-params.dto';

@Controller('api/claims-list')
export class ClaimsListController {
  constructor(private readonly service: ClaimsListService) {}

  @Get('claims')
  getClaims(@Query() q: ClaimPaymentQueryParams) {
    return this.service.getClaims(q);
  }

  @Get('cards')
  getCards(@Query() q: ClaimPaymentQueryParams) {
    return this.service.getCards(q);
  }
}
