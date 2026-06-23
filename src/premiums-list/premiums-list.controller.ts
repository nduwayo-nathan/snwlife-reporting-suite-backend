import { Controller, Get, Query } from '@nestjs/common';
import { PremiumsListService } from './premiums-list.service';
import { PremiumListQueryParams } from '../share/dto/premium-query-params.dto';

@Controller('api/premiums-list')
export class PremiumsListController {
  constructor(private readonly service: PremiumsListService) {}

  @Get('premiums')
  getPremiums(@Query() q: PremiumListQueryParams) {
    return this.service.getPremiums(q);
  }

  @Get('cards')
  getCards(@Query() q: PremiumListQueryParams) {
    return this.service.getCards(q);
  }
}
