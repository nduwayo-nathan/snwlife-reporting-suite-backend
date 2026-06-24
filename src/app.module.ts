import 'dotenv/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Policy } from './entities/policy.entity';
import { Premium } from './entities/premium.entity';
import { Claim } from './entities/claim.entity';
import { Proposal } from './entities/proposal.entity';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PaymentPremiumsModule } from './payment-premiums/payment-premiums.module';
import { PoliciesListModule } from './policies-list/policies-list.module';
import { ClaimsPaymentModule } from './claims-payment/claims-payment.module';
import { ClaimsInstallmentsModule } from './claims-installments/claims-installments.module';
import { ClaimsListModule } from './claims-list/claims-list.module';
import { ProposalModule } from './proposal/proposal.module';
import { PaymentInstallmentsModule } from './payment-installments/payment-installments.module';
import { PaymentLapsationModule } from './payment-lapsation/payment-lapsation.module';
import { PremiumsListModule } from './premiums-list/premiums-list.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [Policy, Premium, Claim, Proposal],
      synchronize: false,
    }),
    TypeOrmModule.forFeature([Policy]),
    PaymentPremiumsModule,
    PoliciesListModule,
    ClaimsPaymentModule,
    ClaimsInstallmentsModule,
    ClaimsListModule,
    ProposalModule,
    PaymentInstallmentsModule,
    PaymentLapsationModule,
    PremiumsListModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
