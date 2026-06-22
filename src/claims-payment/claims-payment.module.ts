import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClaimsPaymentController } from './claims-payment.controller';
import { ClaimsPaymentService } from './claims-payment.service';
import { Claim } from '../entities/claim.entity';
import { Policy } from '../entities/policy.entity';
import { Premium } from '../entities/premium.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Claim, Policy, Premium])],
  controllers: [ClaimsPaymentController],
  providers: [ClaimsPaymentService],
  exports: [ClaimsPaymentService],
})
export class ClaimsPaymentModule {}
