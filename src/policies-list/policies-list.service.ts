import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from '../entities/policy.entity';
import { Premium } from '../entities/premium.entity';
import { PolicyQueryParams } from '../share/dto/policy-query-params.dto';
import { resolveYears, yearCondition, getInstallmentNo, resolveMonths, monthCondition } from '../share/helpers/date-filter.helper';

@Injectable()
export class PoliciesListService {
  constructor(
    @InjectRepository(Policy) private policyRepo: Repository<Policy>,
    @InjectRepository(Premium) private premiumRepo: Repository<Premium>,
  ) {}

  async getYears(): Promise<number[]> {
    const rows = await this.policyRepo
      .createQueryBuilder('p')
      .select('DISTINCT EXTRACT(YEAR FROM p.effective_date)::int', 'year')
      .where('p.effective_date IS NOT NULL')
      .orderBy('year', 'ASC')
      .getRawMany();
    return rows.map((r) => r.year);
  }

  async getPolicies(q: PolicyQueryParams) {
    const years = resolveYears(q) ?? [new Date().getFullYear()];
    const months = resolveMonths(q);
    const installments = q.installments?.split(',').map(Number).filter(Boolean) ?? [];
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
      
      if (months) subquery.andWhere(monthCondition('pr', 'PaymentDate', months));
      
      qb.where(yearCondition('p', 'effective_date', years))
        .andWhere(`p.policy_number IN (${subquery.getQuery()})`);
    } else {
      // For payment mode: filter by policies that have premium payments in the year(s)
      const subquery = this.premiumRepo
        .createQueryBuilder('pr')
        .select('pr."PolicyNumber"')
        .where('pr."PaymentDate" IS NOT NULL')
        .andWhere(yearCondition('pr', 'PaymentDate', years));
      
      if (months) subquery.andWhere(monthCondition('pr', 'PaymentDate', months));
      
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

    if (!installments.length) {
      console.log(`✅ [Policies API] Retrieved ${policies.length} records (page ${page}/${totalPages}, total: ${total})`);
      return { total, page, pageSize, totalPages, records: policies };
    }

    // filter by installment: need to get all policies for filtering
    const allPolicies = await this.policyRepo
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
      ])
      .where(yearCondition('p', 'effective_date', years))
      .andWhere(q.product ? 'p.product_code = :product' : '1=1', { product: q.product })
      .andWhere(q.search ? '(p.subscriber_name ILIKE :s OR p.policy_number ILIKE :s)' : '1=1', { s: `%${q.search}%` })
      .orderBy('p.total_premium_paid', 'DESC')
      .getRawMany();

    const premiums = await this.premiumRepo
      .createQueryBuilder('pr')
      .select(['"pr"."PolicyNumber"', '"pr"."PaymentDate"'])
      .where('pr."PaymentDate" IS NOT NULL')
      .getRawMany();

    const policyMap = new Map(allPolicies.map((p) => [p.PolicyNumber, p]));
    const matching = new Set<string>();

    premiums.forEach((pr) => {
      const policy = policyMap.get(pr.PolicyNumber);
      if (!policy) return;
      const no = getInstallmentNo(policy.EffectiveDate, pr.PaymentDate);
      if (no !== null && installments.includes(no)) matching.add(pr.PolicyNumber);
    });

    const filtered = allPolicies.filter((p) => matching.has(p.PolicyNumber));
    const filteredTotal = filtered.length;
    const filteredPages = Math.ceil(filteredTotal / pageSize);
    const paginatedFiltered = filtered.slice((page - 1) * pageSize, page * pageSize);
    console.log(`✅ [Policies API] Retrieved ${paginatedFiltered.length} records (page ${page}/${filteredPages}, total: ${filteredTotal})`);
    return { total: filteredTotal, page, pageSize, totalPages: filteredPages, records: paginatedFiltered };
  }

  // Returns premium totals grouped by installment number — matches frontend getPremiumByInstallment()
  async getInstallments(q: PolicyQueryParams) {
    const years = resolveYears(q);
    const dateField = q.dateMode === 'payment' ? 'PaymentDate' : 'EffectDate';
    const policyNums = q.policies?.split(',').filter(Boolean) ?? [];

    const qb = this.premiumRepo
      .createQueryBuilder('pr')
      .innerJoin(Policy, 'pol', 'pol.policy_number = pr."PolicyNumber"')
      .select([
        '"pr"."PolicyNumber"',
        '"pr"."PaymentDate"',
        '"pr"."PremiumPaid"',
        'pol.effective_date as "EffectiveDate"',
      ])
      .where('pr."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('pr', dateField, years));

    if (q.product) qb.andWhere('pol.product_code = :product', { product: q.product });
    if (policyNums.length) qb.andWhere('pr."PolicyNumber" IN (:...policyNums)', { policyNums });

    const rows = await qb.getRawMany();
    const grouped = new Map<number, { totalPremium: number; count: number; policySet: Set<string>; days: number[] }>();

    rows.forEach((r) => {
      const no = getInstallmentNo(r.EffectiveDate, r.PaymentDate);
      if (no === null) return;
      const entry = grouped.get(no) ?? { totalPremium: 0, count: 0, policySet: new Set(), days: [] };
      entry.totalPremium += +r.PremiumPaid || 0;
      entry.count += 1;
      entry.policySet.add(r.PolicyNumber);
      entry.days.push(new Date(r.PaymentDate).getDate());
      grouped.set(no, entry);
    });

    return Array.from(grouped.entries())
      .map(([installmentNo, { totalPremium, count, policySet, days }]) => {
        const freq = new Map<number, number>();
        days.forEach((d) => freq.set(d, (freq.get(d) ?? 0) + 1));
        const paymentDay = days.length ? [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0] : null;
        return { installmentNo, totalPremium, count, policyCount: policySet.size, paymentDay };
      })
      .sort((a, b) => a.installmentNo - b.installmentNo);
  }

  // Returns policy counts grouped by installment number — matches frontend getPoliciesByInstallment()
  async getPoliciesByInstallment(q: PolicyQueryParams) {
    const years = resolveYears(q);
    const dateField = q.dateMode === 'payment' ? 'PaymentDate' : 'EffectDate';
    const policyNums = q.policies?.split(',').filter(Boolean) ?? [];

    const qb = this.premiumRepo
      .createQueryBuilder('pr')
      .innerJoin(Policy, 'pol', 'pol.policy_number = pr."PolicyNumber"')
      .select(['"pr"."PolicyNumber"', '"pr"."PaymentDate"', 'pol.effective_date as "EffectiveDate"'])
      .where('pr."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('pr', dateField, years));

    if (q.product) qb.andWhere('pol.product_code = :product', { product: q.product });
    if (policyNums.length) qb.andWhere('pr."PolicyNumber" IN (:...policyNums)', { policyNums });

    const rows = await qb.getRawMany();
    const grouped = new Map<number, Set<string>>();

    rows.forEach((r) => {
      const no = getInstallmentNo(r.EffectiveDate, r.PaymentDate);
      if (no === null) return;
      if (!grouped.has(no)) grouped.set(no, new Set());
      grouped.get(no)!.add(r.PolicyNumber);
    });

    return Array.from(grouped.entries())
      .map(([installmentNo, policySet]) => ({
        installmentNo,
        policies: Array.from(policySet),
        count: policySet.size,
      }))
      .sort((a, b) => a.installmentNo - b.installmentNo);
  }
}
