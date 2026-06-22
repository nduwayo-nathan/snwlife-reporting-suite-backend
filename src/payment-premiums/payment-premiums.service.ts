import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Premium } from '../entities/premium.entity';
import { Policy } from '../entities/policy.entity';
import { PremiumQueryParams, PremiumListQueryParams } from '../share/dto/premium-query-params.dto';
import { resolveYears, yearCondition, resolveMonths, monthCondition } from '../share/helpers/date-filter.helper';

@Injectable()
export class PaymentPremiumsService {
  constructor(
    @InjectRepository(Premium) private premiumRepo: Repository<Premium>,
    @InjectRepository(Policy) private policyRepo: Repository<Policy>,
  ) {}

  async getYears(): Promise<number[]> {
    const rows = await this.premiumRepo
      .createQueryBuilder('p')
      .select('DISTINCT EXTRACT(YEAR FROM p."PaymentDate")::int', 'year')
      .where('p."PaymentDate" IS NOT NULL')
      .orderBy('year', 'ASC')
      .getRawMany();
    return rows.map((r) => r.year);
  }

  async getAvailableYears(): Promise<number[]> {
    return this.getYears();
  }

  async getProductSummary(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const months = resolveMonths(q);
    const dateField = q.dateMode === 'effective' ? 'EffectDate' : 'PaymentDate';
    const policies = q.policies?.split(',').filter(Boolean) ?? [];

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .innerJoin(Policy, 'pol', 'pol.policy_number = p."PolicyNumber"')
      .select('p."Product"', 'product')
      .addSelect('COUNT(DISTINCT p."PolicyNumber")', 'count')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('p', dateField, years))
      .groupBy('p."Product"')
      .orderBy('COUNT(DISTINCT p."PolicyNumber")', 'DESC');

    if (months) qb.andWhere(monthCondition('p', 'PaymentDate', months));
    if (q.state) qb.andWhere('p."State" = :state', { state: q.state });
    if (policies.length) qb.andWhere('p."PolicyNumber" IN (:...policies)', { policies });
    if (q.search) {
      qb.andWhere(
        '(pol.subscriber_name ILIKE :s OR p."PolicyNumber" ILIKE :s OR p."Receipt" ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }

    const rows = await qb.getRawMany();
    return rows.map((r) => ({ product: r.product, count: +r.count }));
  }

  async getStateSummary(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const months = resolveMonths(q);
    const dateField = q.dateMode === 'effective' ? 'EffectDate' : 'PaymentDate';
    const policies = q.policies?.split(',').filter(Boolean) ?? [];

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .innerJoin(Policy, 'pol', 'pol.policy_number = p."PolicyNumber"')
      .select('p."State"', 'state')
      .addSelect('COUNT(DISTINCT (p."PolicyNumber", p."State"))', 'count')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere('p."State" IS NOT NULL')
      .andWhere(yearCondition('p', dateField, years))
      .groupBy('p."State"')
      .orderBy('COUNT(DISTINCT (p."PolicyNumber", p."State"))', 'DESC');

    if (months) qb.andWhere(monthCondition('p', 'PaymentDate', months));
    if (q.product) qb.andWhere('p."Product" = :product', { product: q.product });
    if (policies.length) qb.andWhere('p."PolicyNumber" IN (:...policies)', { policies });
    if (q.search) {
      qb.andWhere(
        '(pol.subscriber_name ILIKE :s OR p."PolicyNumber" ILIKE :s OR p."Receipt" ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }

    const rows = await qb.getRawMany();
    return rows.map((r) => ({ state: r.state, count: +r.count }));
  }

  async getMonthlySummary(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const dateField = q.dateMode === 'effective' ? 'EffectDate' : 'PaymentDate';
    const policies = q.policies?.split(',').filter(Boolean) ?? [];

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .innerJoin(Policy, 'pol', 'pol.policy_number = p."PolicyNumber"')
      .select('EXTRACT(MONTH FROM p."PaymentDate")::int', 'month')
      .addSelect('SUM(p."PremiumPaid")', 'value')
      .addSelect('COUNT(DISTINCT p."PolicyNumber")', 'policies')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('p', dateField, years))
      .groupBy('month')
      .orderBy('month', 'ASC');

    if (q.product) qb.andWhere('p."Product" = :product', { product: q.product });
    if (q.state) qb.andWhere('p."State" = :state', { state: q.state });
    if (policies.length) qb.andWhere('p."PolicyNumber" IN (:...policies)', { policies });
    if (q.search) {
      qb.andWhere(
        '(pol.subscriber_name ILIKE :s OR p."PolicyNumber" ILIKE :s OR p."Receipt" ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }

    const rows = await qb.getRawMany();

    const policyQb = this.policyRepo
      .createQueryBuilder('pol')
      .select('EXTRACT(MONTH FROM pol.effective_date)::int', 'month')
      .addSelect('COUNT(DISTINCT pol.policy_number)', 'effective')
      .where('pol.effective_date IS NOT NULL')
      .andWhere(yearCondition('pol', 'effective_date', years))
      .groupBy('month');

    if (q.product) policyQb.andWhere('pol.product_code = :product', { product: q.product });
    if (q.search) {
      policyQb.andWhere(
        '(pol.subscriber_name ILIKE :s OR pol.policy_number ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }
    const effectiveRows = await policyQb.getRawMany();
    const effectiveMap = new Map(effectiveRows.map((r) => [r.month, +r.effective]));

    return rows.map((r) => ({
      month: r.month,
      value: +r.value,
      policies: +r.policies,
      effective: effectiveMap.get(r.month) ?? 0,
    }));
  }

  async getRecords(q: PremiumQueryParams) {
    const years = resolveYears(q) ?? [new Date().getFullYear()];
    const months = resolveMonths(q);
    const dateField = q.dateMode === 'effective' ? 'EffectDate' : 'PaymentDate';
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
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
        'pol.effective_date as "EffectiveDate"',
      ])
      .where('p."PaymentDate" IS NOT NULL');

    if (q.dateMode === 'effective') {
      qb.andWhere(yearCondition('pol', 'effective_date', years));
    } else {
      qb.andWhere(yearCondition('p', 'PaymentDate', years));
    }
    if (months) qb.andWhere(monthCondition('p', 'PaymentDate', months));
    if (q.product) qb.andWhere('p."Product" = :product', { product: q.product });
    if (q.state) qb.andWhere('p."State" = :state', { state: q.state });
    if (policies.length) qb.andWhere('p."PolicyNumber" IN (:...policies)', { policies });
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

    console.log(`✅ [Premiums API] Retrieved ${records.length} records (page ${page}/${totalPages}, total: ${total})`);
    return { total, page, pageSize, totalPages, records };
  }

  async getByProduct(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const dateField = q.dateMode === 'effective' ? 'EffectDate' : 'PaymentDate';

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .select('p."Product"', 'product')
      .addSelect('SUM(p."PremiumPaid")', 'total')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('p', dateField, years))
      .groupBy('p."Product"');

    const rows = await qb.getRawMany();
    return rows.map((r) => ({ product: r.product, total: +r.total }));
  }

  async getByState(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const months = resolveMonths(q);
    const dateField = q.dateMode === 'effective' ? 'EffectDate' : 'PaymentDate';
    const policies = q.policies?.split(',').filter(Boolean) ?? [];

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .select('p."State"', 'state')
      .addSelect('SUM(p."PremiumPaid")', 'total')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere('p."State" IS NOT NULL')
      .andWhere(yearCondition('p', dateField, years));

    if (months) qb.andWhere(monthCondition('p', 'PaymentDate', months));
    if (q.product) qb.andWhere('p."Product" = :product', { product: q.product });
    if (policies.length) qb.andWhere('p."PolicyNumber" IN (:...policies)', { policies });

    qb.groupBy('p."State"');

    const rows = await qb.getRawMany();
    return rows.map((r) => ({ state: r.state, total: +r.total }));
  }

  async getCards(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const months = resolveMonths(q);
    const dateField = q.dateMode === 'effective' ? 'EffectDate' : 'PaymentDate';
    const policies = q.policies?.split(',').filter(Boolean) ?? [];

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .innerJoin(Policy, 'pol', 'pol.policy_number = p."PolicyNumber"')
      .select('COUNT(DISTINCT pol.subscriber_number)', 'customers')
      .addSelect('COUNT(DISTINCT p."PolicyNumber")', 'policies')
      .addSelect('SUM(p."PremiumPaid")', 'premiumPaid')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('p', dateField, years));

    if (months) qb.andWhere(monthCondition('p', 'PaymentDate', months));
    if (q.product) qb.andWhere('p."Product" = :product', { product: q.product });
    if (q.state) qb.andWhere('p."State" = :state', { state: q.state });
    if (policies.length) qb.andWhere('p."PolicyNumber" IN (:...policies)', { policies });
    if (q.search) {
      qb.andWhere(
        '(pol.subscriber_name ILIKE :s OR p."PolicyNumber" ILIKE :s OR p."Receipt" ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }

    const row = await qb.getRawOne();

    // Get lapsed policies count
    const lapsedQb = this.policyRepo
      .createQueryBuilder('pol')
      .select('COUNT(DISTINCT pol.policy_number)', 'lapsedPolicies')
      .where('pol.status = :status', { status: 'Lapsed' })
      .andWhere(yearCondition('pol', 'effective_date', years));

    if (q.product) lapsedQb.andWhere('pol.product_code = :product', { product: q.product });
    if (q.search) {
      lapsedQb.andWhere(
        '(pol.subscriber_name ILIKE :s OR pol.policy_number ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }

    const lapsedRow = await lapsedQb.getRawOne();

    // Get latest posting date from premium table
    const latestDateQb = this.premiumRepo
      .createQueryBuilder('p')
      .innerJoin(Policy, 'pol', 'pol.policy_number = p."PolicyNumber"')
      .select('MAX(p."PostingDate")', 'latestPostingDate')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('p', dateField, years));

    if (months) latestDateQb.andWhere(monthCondition('p', 'PaymentDate', months));
    if (q.product) latestDateQb.andWhere('p."Product" = :product', { product: q.product });
    if (q.state) latestDateQb.andWhere('p."State" = :state', { state: q.state });
    if (policies.length) latestDateQb.andWhere('p."PolicyNumber" IN (:...policies)', { policies });
    if (q.search) {
      latestDateQb.andWhere(
        '(pol.subscriber_name ILIKE :s OR p."PolicyNumber" ILIKE :s OR p."Receipt" ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }

    const latestDateRow = await latestDateQb.getRawOne();

    return {
      customers: +row.customers,
      policies: +row.policies,
      lapsedPolicies: +lapsedRow.lapsedPolicies,
      premiumPaid: +row.premiumPaid,
      latestPostingDate: latestDateRow.latestPostingDate,
    };
  }

  async getPoliciesSummary(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const months = resolveMonths(q);
    const dateField = q.dateMode === 'effective' ? 'EffectDate' : 'PaymentDate';
    const page = q.page ? +q.page : 1;
    const pageSize = q.pageSize ? +q.pageSize : 500;

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .innerJoin(Policy, 'pol', 'pol.policy_number = p."PolicyNumber"')
      .select('p."PolicyNumber"', 'PolicyNumber')
      .addSelect('MAX(pol.subscriber_number)', 'SubscriberNumber')
      .addSelect('MAX(pol.subscriber_name)', 'SubscriberName')
      .addSelect('MAX(p."Product")', 'ProductCode')
      .addSelect('MAX(pol.product_name)', 'ProductName')
      .addSelect('MAX(pol.agent_code)', 'AgentCode')
      .addSelect('MAX(pol.agent_name)', 'AgentName')
      .addSelect('MAX(pol.effective_date)', 'EffectiveDate')
      .addSelect('MAX(pol.expiry_date)', 'ExpiryDate')
      .addSelect('MAX(pol.premium)', 'Premium')
      .addSelect('MAX(pol.sum_assured)', 'SumAssured')
      .addSelect('MAX(pol.status)', 'Status')
      .addSelect('MAX(pol.status_date)', 'StatusDate')
      .addSelect('MAX(pol.contract_duration)', 'ContractDuration')
      .addSelect('MAX(pol.total_pure_premium)', 'TotalPurePremium')
      .addSelect('MAX(pol.date_lapsed)', 'DateLapsed')
      .addSelect('MAX(pol.date_paid_up)', 'DatePaidUp')
      .addSelect('SUM(p."PremiumPaid")', 'TotalPremiumPaid')
      .addSelect('MAX(p."PaymentDate")', 'LastPaymentDate')
      .addSelect('MAX(p."State")', 'State')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('p', dateField, years))
      .andWhere(months ? monthCondition('p', 'PaymentDate', months) : '1=1')
      .andWhere(q.product ? 'p."Product" = :product' : '1=1', { product: q.product })
      .andWhere(q.state ? 'p."State" = :state' : '1=1', { state: q.state })
      .groupBy('p."PolicyNumber"');
    if (q.search) {
      qb.andWhere(
        'p."PolicyNumber" ILIKE :s OR pol.subscriber_name ILIKE :s',
        { s: `%${q.search}%` },
      );
    }

    const countQb = this.premiumRepo
      .createQueryBuilder('p')
      .innerJoin(Policy, 'pol', 'pol.policy_number = p."PolicyNumber"')
      .select('COUNT(DISTINCT p."PolicyNumber")', 'count')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('p', dateField, years))
      .andWhere(months ? monthCondition('p', 'PaymentDate', months) : '1=1')
      .andWhere(q.product ? 'p."Product" = :product' : '1=1', { product: q.product })
      .andWhere(q.state ? 'p."State" = :state' : '1=1', { state: q.state });
    if (q.search) {
      countQb.andWhere(
        'p."PolicyNumber" ILIKE :s OR pol.subscriber_name ILIKE :s',
        { s: `%${q.search}%` },
      );
    }

    const countRow = await countQb.getRawOne();
    const total = +countRow.count;
    const totalPages = Math.ceil(total / pageSize);

    const records = await qb
      .orderBy('SUM(p."PremiumPaid")', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    return { total, page, pageSize, totalPages, records };
  }

  async getList(q: PremiumListQueryParams) {
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
      totalPages,
      records,
      cards: {
        policies: +cardRow.policies,
        expectedPremium: +cardRow.expectedPremium,
        premiumPaid: +cardRow.premiumPaid,
      },
    };
  }
}
