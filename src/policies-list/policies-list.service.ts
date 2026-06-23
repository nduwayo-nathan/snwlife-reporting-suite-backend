import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from '../entities/policy.entity';
import { Premium } from '../entities/premium.entity';
import { PolicyQueryParams } from '../share/dto/policy-query-params.dto';
import { resolveYears, yearCondition } from '../share/helpers/date-filter.helper';

@Injectable()
export class PoliciesListService {
  constructor(
    @InjectRepository(Policy) private policyRepo: Repository<Policy>,
    @InjectRepository(Premium) private premiumRepo: Repository<Premium>,
  ) {}

  async getPolicies(q: PolicyQueryParams) {
    const years = resolveYears(q) ?? [new Date().getFullYear()];
    const page = q.page ? +q.page : 1;
    const pageSize = q.pageSize ? +q.pageSize : 500;

    const qb = this.policyRepo
      .createQueryBuilder('p')
      .select([
        'p.policy_number as "PolicyNumber"',
        'p.subscriber_number as "SubscriberNumber"',
        'p.subscriber_name as "SubscriberName"',
        'p.product_code as "ProductCode"',
        'p.product_name as "ProductName"',
        'p.agent_code as "AgentCode"',
        'p.agent_name as "AgentName"',
        'p.effective_date as "EffectiveDate"',
        'p.expiry_date as "ExpiryDate"',
        'p.premium as "Premium"',
        'p.total_premium_paid as "TotalPremiumPaid"',
        'p.total_pure_premium as "TotalPurePremium"',
        'p.sum_assured as "SumAssured"',
        'p.status as "Status"',
        'p.status_date as "StatusDate"',
        'p.contract_duration as "ContractDuration"',
        'p.last_payment_date as "LastPaymentDate"',
        'p.date_lapsed as "DateLapsed"',
        'p.date_paid_up as "DatePaidUp"',
        'p.gender as "Gender"',
      ]);

    // Apply year filter based on dateMode
    if (q.dateMode === 'effective') {
      // For effective mode: policies that became effective AND paid premiums in the year(s)
      const subquery = this.premiumRepo
        .createQueryBuilder('pr')
        .select('pr."PolicyNumber"')
        .where('pr."PaymentDate" IS NOT NULL')
        .andWhere(yearCondition('pr', 'PaymentDate', years));
      
      qb.where(yearCondition('p', 'effective_date', years))
        .andWhere(`p.policy_number IN (${subquery.getQuery()})`);
    } else {
      // For payment mode: filter by policies that have premium payments in the year(s)
      const subquery = this.premiumRepo
        .createQueryBuilder('pr')
        .select('pr."PolicyNumber"')
        .where('pr."PaymentDate" IS NOT NULL')
        .andWhere(yearCondition('pr', 'PaymentDate', years));
      
      qb.where(`p.policy_number IN (${subquery.getQuery()})`);
    }

    if (q.product) qb.andWhere('p.product_code = :product', { product: q.product });
    if (q.state) qb.andWhere('p.status = :state', { state: q.state });
    if (q.gender) qb.andWhere('p.gender = :gender', { gender: q.gender });
    if (q.search) {
      qb.andWhere(
        '(p.subscriber_name ILIKE :s OR p.policy_number ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }

    const total = await qb.getCount();
    const totalPages = Math.ceil(total / pageSize);
    const policies = await qb
      .orderBy('p.total_premium_paid', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    console.log(`✅ [Policies List API] Retrieved ${policies.length} records (page ${page}/${totalPages}, total: ${total})`);
    return { total, page, pageSize, totalPages, records: policies };
  }

  async getCards(q: PolicyQueryParams) {
    const years = resolveYears(q) ?? [new Date().getFullYear()];

    const qb = this.policyRepo
      .createQueryBuilder('p')
      .select('COUNT(DISTINCT p.policy_number)', 'policies')
      .addSelect('SUM(p.premium)', 'totalPremium')
      .addSelect('SUM(p.total_premium_paid)', 'totalPremiumPaid');

    // Apply year filter based on dateMode
    if (q.dateMode === 'effective') {
      const subquery = this.premiumRepo
        .createQueryBuilder('pr')
        .select('pr."PolicyNumber"')
        .where('pr."PaymentDate" IS NOT NULL')
        .andWhere(yearCondition('pr', 'PaymentDate', years));
      
      qb.where(yearCondition('p', 'effective_date', years))
        .andWhere(`p.policy_number IN (${subquery.getQuery()})`);
    } else {
      const subquery = this.premiumRepo
        .createQueryBuilder('pr')
        .select('pr."PolicyNumber"')
        .where('pr."PaymentDate" IS NOT NULL')
        .andWhere(yearCondition('pr', 'PaymentDate', years));
      
      qb.where(`p.policy_number IN (${subquery.getQuery()})`);
    }

    if (q.product) qb.andWhere('p.product_code = :product', { product: q.product });
    if (q.state) qb.andWhere('p.status = :state', { state: q.state });
    if (q.gender) qb.andWhere('p.gender = :gender', { gender: q.gender });
    if (q.search) {
      qb.andWhere(
        '(p.subscriber_name ILIKE :s OR p.policy_number ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }

    const result = await qb.getRawOne();

    console.log('[Policies List Cards API] Summary:', result);
    return {
      policies: +result.policies,
      totalPremium: +result.totalPremium,
      totalPremiumPaid: +result.totalPremiumPaid,
    };
  }
}
