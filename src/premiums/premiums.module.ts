import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Premium } from '../entities/premium.entity';
import { Policy } from '../entities/policy.entity';
import { PremiumsService } from './premiums.service';
import { PremiumsController } from './premiums.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Premium, Policy])],
  controllers: [PremiumsController],
  providers: [PremiumsService],
})
export class PremiumsModule {}
