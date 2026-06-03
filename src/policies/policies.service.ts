import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from '../entities/policy.entity';
import { Premium } from '../entities/premium.entity';
import { PolicyQueryParams } from '../share/dto/policy-query-params.dto';
import {
  resolveYears,
  yearCondition,
  getInstallmentNo,
} from '../share/helpers/date-filter.helper';

@Injectable()
export class PoliciesService {
  constructor(
    @InjectRepository(Policy) private policyRepo: Repository<Policy>,
    @InjectRepository(Premium) private premiumRepo: Repository<Premium>,
  ) {}

  async getYears(): Promise<number[]> {
    const rows = await this.policyRepo
      .createQueryBuilder('p')
      .select('DISTINCT EXTRACT(YEAR FROM p."EffectiveDate")::int', 'year')
      .where('p."EffectiveDate" IS NOT NULL')
      .orderBy('year', 'ASC')
      .getRawMany();
    return rows.map((r) => r.year);
  }

  async getPolicies(q: PolicyQueryParams) {
    const years = resolveYears(q);
    const dateField =
      q.dateMode === 'payment' ? 'LastPaymentDate' : 'EffectiveDate';
    const installments =
      q.installment?.split(',').map(Number).filter(Boolean) ?? [];

    const qb = this.policyRepo
      .createQueryBuilder('p')
      .select([
        'p."PolicyNumber" as "PolicyNumber"',
        'p."SubscriberNumber" as "SubscriberNumber"',
        'p."SubscriberName" as "SubscriberName"',
        'p."ProductCode" as "ProductCode"',
        'p."ProductName" as "ProductName"',
        'p."AgentCode" as "AgentCode"',
        'p."AgentName" as "AgentName"',
        'p."EffectiveDate" as "EffectiveDate"',
        'p."ExpiryDate" as "ExpiryDate"',
        'p."Premium" as "Premium"',
        'p."TotalPremiumPaid" as "TotalPremiumPaid"',
        'p."Status" as "Status"',
        'p."ContractDuration" as "ContractDuration"',
      ])
      .where(yearCondition('p', dateField, years));

    if (q.product)
      qb.andWhere('p."ProductCode" = :product', { product: q.product });
    if (q.state) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM premiums pr WHERE pr."PolicyNumber" = p."PolicyNumber" AND pr."State" = :state)`,
        { state: q.state },
      );
    }

    const policies = await qb.getRawMany();

    if (!installments.length) return policies;

    // filter by installment: only keep policies that have a premium paid on given installment(s)
    const premiums = await this.premiumRepo
      .createQueryBuilder('pr')
      .select(['pr."PolicyNumber"', 'pr."PaymentDate"'])
      .where('pr."PaymentDate" IS NOT NULL')
      .getRawMany();

    const policyMap = new Map(policies.map((p) => [p.PolicyNumber, p]));
    const matching = new Set<string>();

    premiums.forEach((pr) => {
      const policy = policyMap.get(pr.PolicyNumber);
      if (!policy) return;
      const no = getInstallmentNo(policy.EffectiveDate, pr.PaymentDate);
      if (no !== null && installments.includes(no))
        matching.add(pr.PolicyNumber);
    });

    return policies.filter((p) => matching.has(p.PolicyNumber));
  }

  async getInstallments(q: PolicyQueryParams) {
    const years = resolveYears(q);
    const dateField = q.dateMode === 'payment' ? 'PaymentDate' : 'EffectDate';
    const policies = q.installment?.split(',').filter(Boolean) ?? [];

    const prQb = this.premiumRepo
      .createQueryBuilder('pr')
      .innerJoin(Policy, 'pol', 'pol."PolicyNumber" = pr."PolicyNumber"')
      .select(['pr."PolicyNumber"', 'pr."PaymentDate"', 'pol."EffectiveDate"'])
      .where('pr."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('pr', dateField, years));

    if (q.product)
      prQb.andWhere('pol."ProductCode" = :product', { product: q.product });
    if (q.state) prQb.andWhere('pr."State" = :state', { state: q.state });
    if (policies.length)
      prQb.andWhere('pr."PolicyNumber" IN (:...policies)', { policies });

    const rows = await prQb.getRawMany();

    const grouped = new Map<
      number,
      { totalPremium: number; count: number; policySet: Set<string> }
    >();
    rows.forEach((r) => {
      const no = getInstallmentNo(r.EffectiveDate, r.PaymentDate);
      if (no === null) return;
      const entry = grouped.get(no) ?? {
        totalPremium: 0,
        count: 0,
        policySet: new Set(),
      };
      entry.totalPremium += +r.PremiumPaid || 0;
      entry.count += 1;
      entry.policySet.add(r.PolicyNumber);
      grouped.set(no, entry);
    });

    // get premiums with amounts for totals
    const prWithAmounts = await this.premiumRepo
      .createQueryBuilder('pr')
      .innerJoin(Policy, 'pol', 'pol."PolicyNumber" = pr."PolicyNumber"')
      .select([
        'pr."PolicyNumber"',
        'pr."PaymentDate"',
        'pr."PremiumPaid"',
        'pol."EffectiveDate"',
      ])
      .where('pr."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('pr', dateField, years))
      .getRawMany();

    const groupedFull = new Map<
      number,
      { totalPremium: number; count: number; policySet: Set<string> }
    >();
    prWithAmounts.forEach((r) => {
      if (policies.length && !policies.includes(r.PolicyNumber)) return;
      if (q.product) return; // handled in query
      const no = getInstallmentNo(r.EffectiveDate, r.PaymentDate);
      if (no === null) return;
      const entry = groupedFull.get(no) ?? {
        totalPremium: 0,
        count: 0,
        policySet: new Set(),
      };
      entry.totalPremium += +r.PremiumPaid;
      entry.count += 1;
      entry.policySet.add(r.PolicyNumber);
      groupedFull.set(no, entry);
    });

    return Array.from(groupedFull.entries())
      .map(([installmentNo, { totalPremium, count, policySet }]) => ({
        installmentNo,
        totalPremium,
        count,
        policyCount: policySet.size,
      }))
      .sort((a, b) => a.installmentNo - b.installmentNo);
  }
}
