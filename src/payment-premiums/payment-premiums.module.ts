import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Premium } from '../entities/premium.entity';
import { Policy } from '../entities/policy.entity';
import { Claim } from '../entities/claim.entity';
import { PaymentPremiumsService } from './payment-premiums.service';
import { PaymentPremiumsController } from './payment-premiums.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Premium, Policy, Claim])],
  controllers: [PaymentPremiumsController],
  providers: [PaymentPremiumsService],
})
export class PaymentPremiumsModule {}
