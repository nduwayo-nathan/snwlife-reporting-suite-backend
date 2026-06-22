import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Policy } from '../entities/policy.entity';
import { Premium } from '../entities/premium.entity';
import { PoliciesListService } from './policies-list.service';
import { PoliciesListController } from './policies-list.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Policy, Premium])],
  controllers: [PoliciesListController],
  providers: [PoliciesListService],
})
export class PoliciesListModule {}
