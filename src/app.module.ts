import 'dotenv/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Policy } from './entities/policy.entity';
import { Premium } from './entities/premium.entity';
import { Claim } from './entities/claim.entity';
import { Proposal } from './entities/proposal.entity';
import { PremiumsModule } from './premiums/premiums.module';
import { PoliciesModule } from './policies/policies.module';
import { ClaimsModule } from './claims/claims.module';
import { ProposalsModule } from './proposals/proposals.module';

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
    PremiumsModule,
    PoliciesModule,
    ClaimsModule,
    ProposalsModule,
  ],
})
export class AppModule {}
