import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Premium } from '../entities/premium.entity';
import { Policy } from '../entities/policy.entity';
import { PremiumQueryParams } from '../share/dto/premium-query-params.dto';
import { resolveYears, yearCondition, resolveMonths, monthCondition } from '../share/helpers/date-filter.helper';

@Injectable()
export class InstallmentsService {
  constructor(
    @InjectRepository(Premium) private premiumRepo: Repository<Premium>,
    @InjectRepository(Policy) private policyRepo: Repository<Policy>,
  ) {}

  async getSummary(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    // DO NOT use installments filter in summary - always show all installments like months in premium

    // Updated installment expression: no installment 0, supports negative installments
    const monthDiffExpr = `(
      (EXTRACT(YEAR FROM p."PaymentDate"::date) - EXTRACT(YEAR FROM pol.effective_date::date)) * 12
      + (EXTRACT(MONTH FROM p."PaymentDate"::date) - EXTRACT(MONTH FROM pol.effective_date::date))
    )`;
    const installmentExpr = `CASE 
      WHEN ${monthDiffExpr} >= 0 THEN ${monthDiffExpr} + 1
      ELSE ${monthDiffExpr}
    END`;

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .innerJoin(Policy, 'pol', 'pol.policy_number = p."PolicyNumber"')
      .select(installmentExpr, 'installmentNo')
      .addSelect('SUM(p."PremiumPaid")', 'totalPremium')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(EXTRACT(DAY FROM p."PaymentDate"))', 'paymentDay')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere('pol.effective_date IS NOT NULL');

    if (q.dateMode === 'effective') {
      qb.andWhere(yearCondition('pol', 'effective_date', years));
    } else {
      qb.andWhere(yearCondition('p', 'PaymentDate', years));
    }

    if (q.product) qb.andWhere('p."Product" = :product', { product: q.product });
    if (q.state) qb.andWhere('p."State" = :state', { state: q.state });
    if (policies.length) qb.andWhere('p."PolicyNumber" IN (:...policies)', { policies });
    // IMPORTANT: Do NOT filter by installments here - we want ALL installments to show

    qb.groupBy(installmentExpr).orderBy('"installmentNo"', 'ASC');

    const rows = await qb.getRawMany();
    const result = rows.map((r) => ({
      installmentNo: +r.installmentNo,
      totalPremium: +r.totalPremium,
      count: +r.count,
      paymentDay: r.paymentDay ? Math.round(+r.paymentDay) : null,
    }));

    // For single year + effective mode, fill 1-12
    if (q.filterMode === 'single' && q.dateMode === 'effective') {
      const existing = new Map(result.map((r) => [r.installmentNo, r]));
      const complete: { installmentNo: number; totalPremium: number; count: number; paymentDay: number | null }[] = [];
      for (let i = 1; i <= 12; i++) {
        complete.push(existing.get(i) ?? { installmentNo: i, totalPremium: 0, count: 0, paymentDay: null });
      }
      return complete;
    }

    return result;
  }

  async getPolicyTrend(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    const installments = q.installments?.split(',').map(Number).filter(Boolean) ?? [];

    const monthDiffExpr = `(
      (EXTRACT(YEAR FROM p."PaymentDate"::date) - EXTRACT(YEAR FROM pol.effective_date::date)) * 12
      + (EXTRACT(MONTH FROM p."PaymentDate"::date) - EXTRACT(MONTH FROM pol.effective_date::date))
    )`;
    const installmentExpr = `CASE 
      WHEN ${monthDiffExpr} >= 0 THEN ${monthDiffExpr} + 1
      ELSE ${monthDiffExpr}
    END`;

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .innerJoin(Policy, 'pol', 'pol.policy_number = p."PolicyNumber"')
      .select(installmentExpr, 'installmentNo')
      .addSelect('array_agg(DISTINCT p."PolicyNumber")', 'policies')
      .addSelect('COUNT(DISTINCT p."PolicyNumber")', 'count')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere('pol.effective_date IS NOT NULL');

    if (q.dateMode === 'effective') {
      qb.andWhere(yearCondition('pol', 'effective_date', years));
    } else {
      qb.andWhere(yearCondition('p', 'PaymentDate', years));
    }

    if (q.product) qb.andWhere('p."Product" = :product', { product: q.product });
    if (q.state) qb.andWhere('p."State" = :state', { state: q.state });
    if (policies.length) qb.andWhere('p."PolicyNumber" IN (:...policies)', { policies });
    if (installments.length) {
      qb.andWhere(`${installmentExpr} IN (:...installments)`, { installments });
    }

    qb.groupBy(installmentExpr).orderBy('"installmentNo"', 'ASC');

    const rows = await qb.getRawMany();
    const result = rows.map((r) => ({
      installmentNo: +r.installmentNo,
      policies: r.policies,
      count: +r.count,
    }));

    // For single year + effective mode, fill 1-12
    if (q.filterMode === 'single' && q.dateMode === 'effective') {
      const existing = new Map(result.map((r) => [r.installmentNo, r]));
      const complete: { installmentNo: number; policies: string[]; count: number }[] = [];
      for (let i = 1; i <= 12; i++) {
        complete.push(existing.get(i) ?? { installmentNo: i, policies: [], count: 0 });
      }
      return complete;
    }

    return result;
  }

  async getProductSummary(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    const installments = q.installments?.split(',').map(Number).filter(Boolean) ?? [];

    const monthDiffExpr = `(
      (EXTRACT(YEAR FROM p."PaymentDate"::date) - EXTRACT(YEAR FROM pol.effective_date::date)) * 12
      + (EXTRACT(MONTH FROM p."PaymentDate"::date) - EXTRACT(MONTH FROM pol.effective_date::date))
    )`;
    const installmentExpr = `CASE 
      WHEN ${monthDiffExpr} >= 0 THEN ${monthDiffExpr} + 1
      ELSE ${monthDiffExpr}
    END`;

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .innerJoin(Policy, 'pol', 'pol.policy_number = p."PolicyNumber"')
      .select('p."Product"', 'product')
      .addSelect('SUM(p."PremiumPaid")', 'count')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere('pol.effective_date IS NOT NULL');

    if (q.dateMode === 'effective') {
      qb.andWhere(yearCondition('pol', 'effective_date', years));
    } else {
      qb.andWhere(yearCondition('p', 'PaymentDate', years));
    }

    if (q.state) qb.andWhere('p."State" = :state', { state: q.state });
    if (policies.length) qb.andWhere('p."PolicyNumber" IN (:...policies)', { policies });
    if (installments.length) {
      qb.andWhere(`${installmentExpr} IN (:...installments)`, { installments });
    }

    qb.groupBy('p."Product"').orderBy('SUM(p."PremiumPaid")', 'DESC');

    const rows = await qb.getRawMany();
    return rows.map((r) => ({ product: r.product, count: +r.count }));
  }

  async getStateSummary(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    const installments = q.installments?.split(',').map(Number).filter(Boolean) ?? [];

    const monthDiffExpr = `(
      (EXTRACT(YEAR FROM p."PaymentDate"::date) - EXTRACT(YEAR FROM pol.effective_date::date)) * 12
      + (EXTRACT(MONTH FROM p."PaymentDate"::date) - EXTRACT(MONTH FROM pol.effective_date::date))
    )`;
    const installmentExpr = `CASE 
      WHEN ${monthDiffExpr} >= 0 THEN ${monthDiffExpr} + 1
      ELSE ${monthDiffExpr}
    END`;

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .innerJoin(Policy, 'pol', 'pol.policy_number = p."PolicyNumber"')
      .select('p."State"', 'state')
      .addSelect('SUM(p."PremiumPaid")', 'count')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere('pol.effective_date IS NOT NULL')
      .andWhere('p."State" IS NOT NULL');

    if (q.dateMode === 'effective') {
      qb.andWhere(yearCondition('pol', 'effective_date', years));
    } else {
      qb.andWhere(yearCondition('p', 'PaymentDate', years));
    }

    if (q.product) qb.andWhere('p."Product" = :product', { product: q.product });
    if (policies.length) qb.andWhere('p."PolicyNumber" IN (:...policies)', { policies });
    if (installments.length) {
      qb.andWhere(`${installmentExpr} IN (:...installments)`, { installments });
    }

    qb.groupBy('p."State"').orderBy('SUM(p."PremiumPaid")', 'DESC');

    const rows = await qb.getRawMany();
    return rows.map((r) => ({ state: r.state, count: +r.count }));
  }

  async getCards(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    const installments = q.installments?.split(',').map(Number).filter(Boolean) ?? [];

    const monthDiffExpr = `(
      (EXTRACT(YEAR FROM p."PaymentDate"::date) - EXTRACT(YEAR FROM pol.effective_date::date)) * 12
      + (EXTRACT(MONTH FROM p."PaymentDate"::date) - EXTRACT(MONTH FROM pol.effective_date::date))
    )`;
    const installmentExpr = `CASE 
      WHEN ${monthDiffExpr} >= 0 THEN ${monthDiffExpr} + 1
      ELSE ${monthDiffExpr}
    END`;

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .innerJoin(Policy, 'pol', 'pol.policy_number = p."PolicyNumber"')
      .select('COUNT(DISTINCT p."PolicyNumber")', 'policies')
      .addSelect(`COUNT(DISTINCT ${installmentExpr})`, 'installments')
      .addSelect('SUM(p."PremiumPaid")', 'premiumPaid')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere('pol.effective_date IS NOT NULL');

    if (q.dateMode === 'effective') {
      qb.andWhere(yearCondition('pol', 'effective_date', years));
    } else {
      qb.andWhere(yearCondition('p', 'PaymentDate', years));
    }

    if (q.product) qb.andWhere('p."Product" = :product', { product: q.product });
    if (q.state) qb.andWhere('p."State" = :state', { state: q.state });
    if (policies.length) qb.andWhere('p."PolicyNumber" IN (:...policies)', { policies });
    if (installments.length) {
      qb.andWhere(`${installmentExpr} IN (:...installments)`, { installments });
    }

    const row = await qb.getRawOne();
    return {
      policies: +row.policies,
      installments: +row.installments,
      premiumPaid: +row.premiumPaid,
    };
  }

  async getPremiums(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    const installments = q.installments?.split(',').map(Number).filter(Boolean) ?? [];
    const page = q.page ? +q.page : 1;
    const pageSize = q.pageSize ? +q.pageSize : 500;

    const monthDiffExpr = `(
      (EXTRACT(YEAR FROM p."PaymentDate"::date) - EXTRACT(YEAR FROM pol.effective_date::date)) * 12
      + (EXTRACT(MONTH FROM p."PaymentDate"::date) - EXTRACT(MONTH FROM pol.effective_date::date))
    )`;
    const installmentExpr = `CASE 
      WHEN ${monthDiffExpr} >= 0 THEN ${monthDiffExpr} + 1
      ELSE ${monthDiffExpr}
    END`;

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
        `${installmentExpr} as "installmentNo"`,
      ])
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere('pol.effective_date IS NOT NULL');

    if (q.dateMode === 'effective') {
      qb.andWhere(yearCondition('pol', 'effective_date', years));
    } else {
      qb.andWhere(yearCondition('p', 'PaymentDate', years));
    }

    if (q.product) qb.andWhere('p."Product" = :product', { product: q.product });
    if (q.state) qb.andWhere('p."State" = :state', { state: q.state });
    if (policies.length) qb.andWhere('p."PolicyNumber" IN (:...policies)', { policies });
    if (q.search) {
      qb.andWhere(
        '(pol.subscriber_name ILIKE :s OR p."PolicyNumber" ILIKE :s OR p."Receipt" ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }
    if (installments.length) {
      qb.andWhere(`${installmentExpr} IN (:...installments)`, { installments });
    }

    // Get total count and sums
    const totalQuery = qb.clone();
    const totalsResult = await totalQuery
      .select('COUNT(*)', 'count')
      .addSelect('SUM(p."Premium")', 'totalExpected')
      .addSelect('SUM(p."PremiumPaid")', 'totalPaid')
      .getRawOne();

    const total = +totalsResult.count;
    const totalExpected = +totalsResult.totalExpected || 0;
    const totalPaid = +totalsResult.totalPaid || 0;
    const totalPages = Math.ceil(total / pageSize);

    const records = await qb
      .orderBy('p."PaymentDate"', 'ASC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    console.log(`✅ [Installments Premiums API] Retrieved ${records.length} records (page ${page}/${totalPages}, total: ${total})`);
    return { total, page, pageSize, totalPages, records, totalExpected, totalPaid };
  }

  async getPolicies(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    const installments = q.installments?.split(',').map(Number).filter(Boolean) ?? [];
    const page = q.page ? +q.page : 1;
    const pageSize = q.pageSize ? +q.pageSize : 500;

    const monthDiffExpr = `(
      (EXTRACT(YEAR FROM pr."PaymentDate"::date) - EXTRACT(YEAR FROM pol.effective_date::date)) * 12
      + (EXTRACT(MONTH FROM pr."PaymentDate"::date) - EXTRACT(MONTH FROM pol.effective_date::date))
    )`;
    const installmentExpr = `CASE 
      WHEN ${monthDiffExpr} >= 0 THEN ${monthDiffExpr} + 1
      ELSE ${monthDiffExpr}
    END`;

    // Build base query for policies with premium payments
    const qb = this.policyRepo
      .createQueryBuilder('pol')
      .innerJoin(Premium, 'pr', 'pr."PolicyNumber" = pol.policy_number')
      .select([
        'DISTINCT pol.policy_number as "PolicyNumber"',
        'pol.subscriber_number as "SubscriberNumber"',
        'pol.subscriber_name as "SubscriberName"',
        'pol.product_code as "ProductCode"',
        'pol.product_name as "ProductName"',
        'pol.agent_code as "AgentCode"',
        'pol.agent_name as "AgentName"',
        'pol.effective_date as "EffectiveDate"',
        'pol.expiry_date as "ExpiryDate"',
        'pol.premium as "Premium"',
        'pol.total_premium_paid as "TotalPremiumPaid"',
        'pol.total_pure_premium as "TotalPurePremium"',
        'pol.sum_assured as "SumAssured"',
        'pol.status as "Status"',
        'pol.status_date as "StatusDate"',
        'pol.contract_duration as "ContractDuration"',
        'pol.last_payment_date as "LastPaymentDate"',
        'pol.date_lapsed as "DateLapsed"',
        'pol.date_paid_up as "DatePaidUp"',
      ])
      .where('pr."PaymentDate" IS NOT NULL')
      .andWhere('pol.effective_date IS NOT NULL');

    // Apply year filter
    if (q.dateMode === 'effective') {
      qb.andWhere(yearCondition('pol', 'effective_date', years));
    } else {
      qb.andWhere(yearCondition('pr', 'PaymentDate', years));
    }

    // Apply additional filters
    if (q.product) qb.andWhere('pol.product_code = :product', { product: q.product });
    if (q.state) qb.andWhere('pr."State" = :state', { state: q.state });
    if (policies.length) qb.andWhere('pol.policy_number IN (:...policies)', { policies });
    if (q.search) {
      qb.andWhere(
        '(pol.subscriber_name ILIKE :s OR pol.policy_number ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }

    // Apply installment filter
    if (installments.length) {
      qb.andWhere(`${installmentExpr} IN (:...installments)`, { installments });
    }

    const total = await qb.getCount();
    const totalPages = Math.ceil(total / pageSize);
    const records = await qb
      .orderBy('pol.total_premium_paid', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    console.log(`✅ [Installments Policies API] Retrieved ${records.length} records (page ${page}/${totalPages}, total: ${total})`);
    return { total, page, pageSize, totalPages, records };
  }
}
