import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Premium } from '../entities/premium.entity';
import { Policy } from '../entities/policy.entity';
import { PremiumListQueryParams } from '../share/dto/premium-query-params.dto';
import { resolveYears, yearCondition } from '../share/helpers/date-filter.helper';

@Injectable()
export class PremiumsListService {
  constructor(
    @InjectRepository(Premium) private premiumRepo: Repository<Premium>,
    @InjectRepository(Policy) private policyRepo: Repository<Policy>,
  ) {}  async getPremiums(q: PremiumListQueryParams) {
    const years = resolveYears(q);
    const page = q.page ? +q.page : 1;
    const pageSize = q.pageSize ? +q.pageSize : 500;

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .innerJoin(Policy, 'pol', 'pol.policy_number = p."PolicyNumber"')
      .select([
        'p."PolicyNumber" as "PolicyNumber"',
        'pol.subscriber_name as "SubscriberName"',
        'p."Product" as "ProductCode"',
        'pol.product_name as "ProductName"',
        'p."EffectDate" as "EffectDate"',
        'p."PremiumDuration" as "PremiumDuration"',
        'p."Premium" as "Premium"',
        'p."PremiumPaid" as "PremiumPaid"',
        'p."PaymentDate" as "PaymentDate"',
        'p."Receipt" as "Receipt"',
        'p."AgencyCode" as "AgencyCode"',
        'p."AgencyName" as "AgencyName"',
        'p."State" as "State"',
      ])
      .where('p."PaymentDate" IS NOT NULL');

    if (q.dateMode === 'effective') {
      qb.andWhere(yearCondition('pol', 'effective_date', years));
    } else {
      qb.andWhere(yearCondition('p', 'PaymentDate', years));
    }

    if (q.product) qb.andWhere('p."Product" = :product', { product: q.product });
    if (q.state) qb.andWhere('p."State" = :state', { state: q.state });
    if (q.search) {
      qb.andWhere(
        '(pol.subscriber_name ILIKE :s OR p."PolicyNumber" ILIKE :s OR p."Receipt" ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }

    const total = await qb.getCount();
    const totalPages = Math.ceil(total / pageSize);
    const records = await qb
      .orderBy('p."PaymentDate"', 'ASC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    const cardQb = this.premiumRepo
      .createQueryBuilder('p')
      .select('COUNT(DISTINCT p."PolicyNumber")', 'policies')
      .addSelect('SUM(p."Premium")', 'expectedPremium')
      .addSelect('SUM(p."PremiumPaid")', 'premiumPaid')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('p', 'PaymentDate', years));

    if (q.product) cardQb.andWhere('p."Product" = :product', { product: q.product });
    if (q.state) cardQb.andWhere('p."State" = :state', { state: q.state });

    const cardRow = await cardQb.getRawOne();

    console.log(`✅ [Premiums List API] Retrieved ${records.length} records (page ${page}/${totalPages}, total: ${total})`);
    return {
      total,
      page,
      pageSize,
      totalPages,
      records,
    };
  }

  async getCards(q: PremiumListQueryParams) {
    const years = resolveYears(q);

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .select('COUNT(DISTINCT p."PolicyNumber")', 'policies')
      .addSelect('SUM(p."Premium")', 'expectedPremium')
      .addSelect('SUM(p."PremiumPaid")', 'premiumPaid')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('p', 'PaymentDate', years));

    if (q.product) qb.andWhere('p."Product" = :product', { product: q.product });
    if (q.state) qb.andWhere('p."State" = :state', { state: q.state });
    if (q.search) {
      const policySubquery = this.policyRepo
        .createQueryBuilder('pol')
        .select('pol.policy_number')
        .where('pol.subscriber_name ILIKE :s OR pol.policy_number ILIKE :s', { s: `%${q.search}%` });
      qb.andWhere(`(p."PolicyNumber" IN (${policySubquery.getQuery()}) OR p."Receipt" ILIKE :s)`, { s: `%${q.search}%` });
    }

    const cardRow = await qb.getRawOne();

    console.log('[Premiums List Cards API] Summary:', cardRow);
    return {
      policies: +cardRow.policies,
      expectedPremium: +cardRow.expectedPremium,
      premiumPaid: +cardRow.premiumPaid,
    };
  }
}
