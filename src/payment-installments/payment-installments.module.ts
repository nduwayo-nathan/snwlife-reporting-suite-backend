import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentInstallmentsController } from './payment-installments.controller';
import { PaymentInstallmentsService } from './payment-installments.service';
import { Premium } from '../entities/premium.entity';
import { Policy } from '../entities/policy.entity';
import { Claim } from '../entities/claim.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Premium, Policy, Claim])],
  controllers: [PaymentInstallmentsController],
  providers: [PaymentInstallmentsService],
})
export class PaymentInstallmentsModule {}
