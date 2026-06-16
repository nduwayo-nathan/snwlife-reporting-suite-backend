import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Claim } from '../entities/claim.entity';
import { Policy } from '../entities/policy.entity';
import { ClaimsService } from './claims.service';
import { ClaimsListController, ClaimsController, ClaimsInstallmentController } from './claims.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Claim, Policy])],
  controllers: [ClaimsListController, ClaimsController, ClaimsInstallmentController],
  providers: [ClaimsService],
})
export class ClaimsModule {}
