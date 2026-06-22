import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClaimsInstallmentsController } from './claims-installments.controller';
import { ClaimsInstallmentsService } from './claims-installments.service';
import { Claim } from '../entities/claim.entity';
import { Policy } from '../entities/policy.entity';
import { Premium } from '../entities/premium.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Claim, Policy, Premium])],
  controllers: [ClaimsInstallmentsController],
  providers: [ClaimsInstallmentsService],
  exports: [ClaimsInstallmentsService],
})
export class ClaimsInstallmentsModule {}
