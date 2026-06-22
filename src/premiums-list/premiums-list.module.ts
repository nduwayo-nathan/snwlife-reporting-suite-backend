import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Premium } from '../entities/premium.entity';
import { Policy } from '../entities/policy.entity';
import { PremiumsListService } from './premiums-list.service';
import { PremiumsListController } from './premiums-list.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Premium, Policy])],
  controllers: [PremiumsListController],
  providers: [PremiumsListService],
})
export class PremiumsListModule {}
