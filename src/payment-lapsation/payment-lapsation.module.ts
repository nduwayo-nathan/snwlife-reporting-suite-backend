import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentLapsationController } from './payment-lapsation.controller';
import { PaymentLapsationService } from './payment-lapsation.service';
import { Policy } from '../entities/policy.entity';
import { Premium } from '../entities/premium.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Policy, Premium])],
  controllers: [PaymentLapsationController],
  providers: [PaymentLapsationService],
  exports: [PaymentLapsationService],
})
export class PaymentLapsationModule {}
