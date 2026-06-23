import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Premium } from '../entities/premium.entity';
import { Policy } from '../entities/policy.entity';
import { PremiumQueryParams } from '../share/dto/premium-query-params.dto';
import { resolveYears, yearCondition, resolveMonths, monthCondition } from '../share/helpers/date-filter.helper';

@Injectable()
export class PaymentLapsationService {
  constructor(
    @InjectRepository(Premium) private premiumRepo: Repository<Premium>,
    @InjectRepository(Policy) private policyRepo: Repository<Policy>,
  ) {}

  async getProductSummary(q: PremiumQueryParams) {
    try {
      const years = resolveYears(q);
      const months = resolveMonths(q);
      const dateField = q.dateMode === 'payment' ? 'last_payment_date' : 'effective_date';

      // Get policies that have unpaid amounts
      const qb = this.policyRepo
        .createQueryBuilder('pol')
        .select('pol.product_code', 'product')
        .addSelect('COUNT(DISTINCT pol.policy_number)', 'count')
        .where(`pol.${dateField} IS NOT NULL`)
        .andWhere(yearCondition('pol', dateField, years))
        .andWhere('pol.premium > COALESCE(pol.total_premium_paid, 0)')
        .groupBy('pol.product_code')
        .orderBy('COUNT(DISTINCT pol.policy_number)', 'DESC');

      if (q.state) {
        qb.innerJoin(Premium, 'p', 'p."PolicyNumber" = pol.policy_number AND p."State" = :state', { state: q.state });
      }

      if (months) {
        qb.andWhere(monthCondition('pol', dateField, months));
      }

      const rows = await qb.getRawMany();
      return rows.map((r) => ({ product: r.product, count: +r.count }));
    } catch (error) {
      console.error('❌ [Lapsation] Error in getProductSummary:', error);
      throw error;
    }
  }

  async getStateSummary(q: PremiumQueryParams) {
    try {
      const years = resolveYears(q);
      const months = resolveMonths(q);
      const dateField = q.dateMode === 'payment' ? 'last_payment_date' : 'effective_date';

      // Get lapsed policies grouped by state from premiums table
      const qb = this.premiumRepo
        .createQueryBuilder('p')
        .innerJoin(Policy, 'pol', 'pol.policy_number = p."PolicyNumber" AND pol.premium > COALESCE(pol.total_premium_paid, 0)')
        .select('p."State"', 'state')
        .addSelect('COUNT(DISTINCT p."PolicyNumber")', 'count')
        .where('p."State" IS NOT NULL')
        .andWhere(yearCondition('pol', dateField, years))
        .groupBy('p."State"')
        .orderBy('COUNT(DISTINCT p."PolicyNumber")', 'DESC');

      if (months) {
        qb.andWhere(monthCondition('pol', dateField, months));
      }

      if (q.product) {
        qb.andWhere('pol.product_code = :product', { product: q.product });
      }

      const rows = await qb.getRawMany();
      return rows.map((r) => ({ state: r.state, count: +r.count }));
    } catch (error) {
      console.error('❌ [Lapsation] Error in getStateSummary:', error);
      throw error;
    }
  }

  async getMonthlySummary(q: PremiumQueryParams) {
    try {
      const years = resolveYears(q);
      const dateField = q.dateMode === 'payment' ? 'payment' : 'effective_date';

      if (q.dateMode === 'payment') {
        // Payment mode: Show policies with missed payments in selected months/year
        if (!years || years.length === 0) {
          throw new Error('Year is required for payment date mode');
        }

        let query = `
          WITH month_series AS (
            SELECT generate_series(1, 12) AS month
          ),
          policy_data AS (
            SELECT 
              pol.policy_number,
              pol.premium,
              pol.effective_date,
              pol.expiry_date,
              FLOOR(COALESCE(pol.total_premium_paid, 0) / (pol.premium / 12)) AS paid_months
            FROM policies pol
            WHERE pol.effective_date IS NOT NULL
              AND pol.expiry_date IS NOT NULL
              AND pol.premium > COALESCE(pol.total_premium_paid, 0)
              AND pol.effective_date <= make_date($1, 12, 31)
              AND pol.expiry_date >= make_date($1, 1, 1)
        `;

        const params: any[] = [years[0]];
        let paramIndex = 2;

        if (q.product) {
          query += ` AND pol.product_code = $${paramIndex}`;
          params.push(q.product);
          paramIndex++;
        }

        if (q.state) {
          query += ` AND EXISTS (
            SELECT 1 FROM premium p 
            WHERE p."PolicyNumber" = pol.policy_number AND p."State" = $${paramIndex}
          )`;
          params.push(q.state);
          paramIndex++;
        }

        query += `
          )
          SELECT 
            ms.month,
            COALESCE(SUM(pd.premium / 12), 0) AS value,
            COUNT(DISTINCT pd.policy_number) AS policies
          FROM month_series ms
          LEFT JOIN policy_data pd ON (
            make_date($1::int, ms.month, 1) >= pd.effective_date
            AND make_date($1::int, ms.month, 1) <= pd.expiry_date
            AND ms.month > pd.paid_months
          )
          GROUP BY ms.month
          ORDER BY ms.month ASC
        `;

        const rows = await this.policyRepo.query(query, params);
        return rows.map((r) => ({
          month: +r.month,
          value: +r.value || 0,
          policies: +r.policies || 0,
        }));
      } else {
        // Effective mode: filter by effective month, but show missed payments by month within that year
        if (!years || years.length === 0) {
          throw new Error('Year is required for effective date mode');
        }

        let query = `
          WITH month_series AS (
            SELECT generate_series(1, 12) AS month
          ),
          policy_data AS (
            SELECT 
              pol.policy_number,
              pol.premium,
              pol.effective_date,
              pol.expiry_date,
              FLOOR(COALESCE(pol.total_premium_paid, 0) / (pol.premium / 12)) AS paid_months
            FROM policies pol
            WHERE pol.effective_date IS NOT NULL
              AND pol.expiry_date IS NOT NULL
              AND EXTRACT(YEAR FROM pol.effective_date) = $1
              AND pol.premium > COALESCE(pol.total_premium_paid, 0)
        `;

        const params: any[] = [years[0]];
        let paramIndex = 2;

        if (q.product) {
          query += ` AND pol.product_code = $${paramIndex}`;
          params.push(q.product);
          paramIndex++;
        }

        if (q.state) {
          query += ` AND EXISTS (
            SELECT 1 FROM premium p 
            WHERE p."PolicyNumber" = pol.policy_number AND p."State" = $${paramIndex}
          )`;
          params.push(q.state);
          paramIndex++;
        }

        query += `
          )
          SELECT 
            ms.month,
            COALESCE(SUM(pd.premium / 12), 0) AS value,
            COUNT(DISTINCT pd.policy_number) AS policies
          FROM month_series ms
          LEFT JOIN policy_data pd ON (
            make_date($1::int, ms.month, LEAST(EXTRACT(DAY FROM pd.effective_date)::int, 28)) >= pd.effective_date
            AND make_date($1::int, ms.month, LEAST(EXTRACT(DAY FROM pd.effective_date)::int, 28)) <= pd.expiry_date
            AND ms.month > pd.paid_months
          )
          GROUP BY ms.month
          ORDER BY ms.month ASC
        `;

        const rows = await this.policyRepo.query(query, params);
        return rows.map((r) => ({
          month: +r.month,
          value: +r.value || 0,
          policies: +r.policies || 0,
        }));
      }
    } catch (error) {
      console.error('❌ [Lapsation] Error in getMonthlySummary:', error);
      throw error;
    }
  }

  async getCards(q: PremiumQueryParams) {
    try {
      const years = resolveYears(q);
      const months = resolveMonths(q);
      const dateField = q.dateMode === 'payment' ? 'last_payment_date' : 'effective_date';

      const qb = this.policyRepo
        .createQueryBuilder('pol')
        .select('COUNT(DISTINCT pol.subscriber_number)', 'customers')
        .addSelect('COUNT(DISTINCT pol.policy_number)', 'policies')
        .addSelect('SUM(pol.premium - COALESCE(pol.total_premium_paid, 0))', 'premiumUnpaid')
        .where(`pol.${dateField} IS NOT NULL`)
        .andWhere(yearCondition('pol', dateField, years))
        .andWhere('pol.premium > COALESCE(pol.total_premium_paid, 0)');

      if (months) {
        qb.andWhere(monthCondition('pol', dateField, months));
      }

      if (q.product) {
        qb.andWhere('pol.product_code = :product', { product: q.product });
      }

      if (q.state) {
        qb.innerJoin(Premium, 'p', 'p."PolicyNumber" = pol.policy_number AND p."State" = :state', { state: q.state });
      }

      const row = await qb.getRawOne();
      return {
        customers: +row.customers || 0,
        policies: +row.policies || 0,
        premiumUnpaid: +row.premiumUnpaid || 0,
      };
    } catch (error) {
      console.error('❌ [Lapsation] Error in getCards:', error);
      throw error;
    }
  }

  async getPolicies(q: PremiumQueryParams) {
    try {
      const years = resolveYears(q);
      const months = resolveMonths(q);
      const page = q.page ? +q.page : 1;
      const pageSize = q.pageSize ? +q.pageSize : 500;

      if (q.dateMode === 'payment') {
        // Payment mode: Show policies that have missed payments in the selected year/months
        if (!years || years.length === 0) {
          throw new Error('Year is required for payment date mode');
        }

        // Build query to find policies with missed payments in the selected year
        let query = `
          WITH policy_payments AS (
            SELECT 
              pol.policy_number,
              pol.subscriber_number,
              pol.subscriber_name,
              pol.product_code,
              pol.product_name,
              pol.agent_code,
              pol.agent_name,
              pol.effective_date,
              pol.expiry_date,
              pol.premium,
              pol.sum_assured,
              pol.status,
              pol.status_date,
              pol.contract_duration,
              pol.total_pure_premium,
              pol.date_lapsed,
              pol.date_paid_up,
              COALESCE(pol.total_premium_paid, 0) as total_premium_paid,
              pol.last_payment_date,
              FLOOR(COALESCE(pol.total_premium_paid, 0) / (pol.premium / 12)) AS paid_months,
              generate_series(
                GREATEST(pol.effective_date, make_date($1, 1, 1)),
                LEAST(pol.expiry_date, make_date($1, 12, 31)),
                interval '1 month'
              )::date AS expected_payment_date
            FROM policies pol
            WHERE pol.effective_date IS NOT NULL
              AND pol.expiry_date IS NOT NULL
              AND pol.premium > COALESCE(pol.total_premium_paid, 0)
              AND pol.effective_date <= make_date($1, 12, 31)
              AND pol.expiry_date >= make_date($1, 1, 1)
        `;

        const params: any[] = [years[0]];
        let paramIndex = 2;

        if (q.product) {
          query += ` AND pol.product_code = $${paramIndex}`;
          params.push(q.product);
          paramIndex++;
        }

        if (q.state) {
          query += ` AND EXISTS (
            SELECT 1 FROM premium p 
            WHERE p."PolicyNumber" = pol.policy_number AND p."State" = $${paramIndex}
          )`;
          params.push(q.state);
          paramIndex++;
        }

        query += `
          ),
          policies_with_missed_payments AS (
            SELECT DISTINCT
              pp.policy_number,
              pp.subscriber_number,
              pp.subscriber_name,
              pp.product_code,
              pp.product_name,
              pp.agent_code,
              pp.agent_name,
              pp.effective_date,
              pp.expiry_date,
              pp.premium,
              pp.sum_assured,
              pp.status,
              pp.status_date,
              pp.contract_duration,
              pp.total_pure_premium,
              pp.date_lapsed,
              pp.date_paid_up,
              pp.total_premium_paid,
              (pp.premium - pp.total_premium_paid) as unpaid_amount,
              pp.last_payment_date
            FROM policy_payments pp
            WHERE EXTRACT(MONTH FROM pp.expected_payment_date) > pp.paid_months
        `;

        if (months) {
          query += ` AND EXTRACT(MONTH FROM pp.expected_payment_date) IN (${months.join(',')})`;
        }

        if (q.search) {
          query += ` AND (pp.policy_number ILIKE $${paramIndex} OR pp.subscriber_name ILIKE $${paramIndex})`;
          params.push(`%${q.search}%`);
          paramIndex++;
        }

        query += `
          )
          SELECT 
            policy_number as "PolicyNumber",
            subscriber_number as "SubscriberNumber",
            subscriber_name as "SubscriberName",
            product_code as "ProductCode",
            product_name as "ProductName",
            agent_code as "AgentCode",
            agent_name as "AgentName",
            effective_date as "EffectiveDate",
            expiry_date as "ExpiryDate",
            premium as "Premium",
            sum_assured as "SumAssured",
            status as "Status",
            status_date as "StatusDate",
            contract_duration as "ContractDuration",
            total_pure_premium as "TotalPurePremium",
            date_lapsed as "DateLapsed",
            date_paid_up as "DatePaidUp",
            total_premium_paid as "TotalPremiumPaid",
            unpaid_amount as "UnpaidAmount",
            last_payment_date as "LastPaymentDate"
          FROM policies_with_missed_payments
          ORDER BY unpaid_amount DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(pageSize, (page - 1) * pageSize);

        // Build separate count query
        let countQuery = `
          WITH policy_payments AS (
            SELECT 
              pol.policy_number,
              FLOOR(COALESCE(pol.total_premium_paid, 0) / (pol.premium / 12)) AS paid_months,
              generate_series(
                GREATEST(pol.effective_date, make_date($1, 1, 1)),
                LEAST(pol.expiry_date, make_date($1, 12, 31)),
                interval '1 month'
              )::date AS expected_payment_date
            FROM policies pol
            WHERE pol.effective_date IS NOT NULL
              AND pol.expiry_date IS NOT NULL
              AND pol.premium > COALESCE(pol.total_premium_paid, 0)
              AND pol.effective_date <= make_date($1, 12, 31)
              AND pol.expiry_date >= make_date($1, 1, 1)
        `;
        
        const countParams: any[] = [years[0]];
        let countParamIndex = 2;

        if (q.product) {
          countQuery += ` AND pol.product_code = $${countParamIndex}`;
          countParams.push(q.product);
          countParamIndex++;
        }

        if (q.state) {
          countQuery += ` AND EXISTS (
            SELECT 1 FROM premium p 
            WHERE p."PolicyNumber" = pol.policy_number AND p."State" = $${countParamIndex}
          )`;
          countParams.push(q.state);
          countParamIndex++;
        }

        countQuery += `
          ),
          policies_with_missed_payments AS (
            SELECT DISTINCT pp.policy_number
            FROM policy_payments pp
            WHERE EXTRACT(MONTH FROM pp.expected_payment_date) > pp.paid_months
        `;

        if (months) {
          countQuery += ` AND EXTRACT(MONTH FROM pp.expected_payment_date) IN (${months.join(',')})`;
        }

        if (q.search) {
          countQuery += ` AND EXISTS (
            SELECT 1 FROM policies pol2 
            WHERE pol2.policy_number = pp.policy_number 
            AND (pol2.policy_number ILIKE $${countParamIndex} OR pol2.subscriber_name ILIKE $${countParamIndex})
          )`;
          countParams.push(`%${q.search}%`);
        }

        countQuery += `
          )
          SELECT COUNT(DISTINCT policy_number) as count
          FROM policies_with_missed_payments
        `;
        
        const countResult = await this.policyRepo.query(countQuery, countParams);
        const total = +countResult[0]?.count || 0;
        const totalPages = Math.ceil(total / pageSize);

        const records = await this.policyRepo.query(query, params);

        console.log(`✅ [Lapsation API] Retrieved ${records.length} lapsed policies with missed payments in ${years[0]} (page ${page}/${totalPages}, total: ${total})`);
        return { total, page, pageSize, totalPages, records };

      } else {
        // Effective mode: Show policies that became effective in the selected year/months and have unpaid amounts
        const qb = this.policyRepo
          .createQueryBuilder('pol')
          .select([
            'pol.policy_number as "PolicyNumber"',
            'pol.subscriber_number as "SubscriberNumber"',
            'pol.subscriber_name as "SubscriberName"',
            'pol.product_code as "ProductCode"',
            'pol.product_name as "ProductName"',
            'pol.agent_code as "AgentCode"',
            'pol.agent_name as "AgentName"',
            'pol.effective_date as "EffectiveDate"',
            'pol.expiry_date as "ExpiryDate"',
            'pol.premium as "Premium"',
            'pol.sum_assured as "SumAssured"',
            'pol.status as "Status"',
            'pol.status_date as "StatusDate"',
            'pol.contract_duration as "ContractDuration"',
            'pol.total_pure_premium as "TotalPurePremium"',
            'pol.date_lapsed as "DateLapsed"',
            'pol.date_paid_up as "DatePaidUp"',
            'COALESCE(pol.total_premium_paid, 0) as "TotalPremiumPaid"',
            '(pol.premium - COALESCE(pol.total_premium_paid, 0)) as "UnpaidAmount"',
            'pol.last_payment_date as "LastPaymentDate"',
          ])
          .where('pol.effective_date IS NOT NULL')
          .andWhere(yearCondition('pol', 'effective_date', years))
          .andWhere('pol.premium > COALESCE(pol.total_premium_paid, 0)');

        if (months) {
          qb.andWhere(monthCondition('pol', 'effective_date', months));
        }

        if (q.product) {
          qb.andWhere('pol.product_code = :product', { product: q.product });
        }

        if (q.state) {
          qb.innerJoin(Premium, 'p', 'p."PolicyNumber" = pol.policy_number AND p."State" = :state', { state: q.state });
        }

        if (q.search) {
          qb.andWhere(
            '(pol.policy_number ILIKE :s OR pol.subscriber_name ILIKE :s)',
            { s: `%${q.search}%` },
          );
        }

        const countQb = this.policyRepo
          .createQueryBuilder('pol')
          .select('COUNT(DISTINCT pol.policy_number)', 'count')
          .where('pol.effective_date IS NOT NULL')
          .andWhere(yearCondition('pol', 'effective_date', years))
          .andWhere('pol.premium > COALESCE(pol.total_premium_paid, 0)');

        if (months) {
          countQb.andWhere(monthCondition('pol', 'effective_date', months));
        }

        if (q.product) {
          countQb.andWhere('pol.product_code = :product', { product: q.product });
        }

        if (q.state) {
          countQb.innerJoin(Premium, 'p', 'p."PolicyNumber" = pol.policy_number AND p."State" = :state', { state: q.state });
        }

        if (q.search) {
          countQb.andWhere(
            '(pol.policy_number ILIKE :s OR pol.subscriber_name ILIKE :s)',
            { s: `%${q.search}%` },
          );
        }

        const countRow = await countQb.getRawOne();
        const total = +countRow.count || 0;
        const totalPages = Math.ceil(total / pageSize);

        const records = await qb
          .orderBy('"UnpaidAmount"', 'DESC')
          .offset((page - 1) * pageSize)
          .limit(pageSize)
          .getRawMany();

        console.log(`✅ [Lapsation API] Retrieved ${records.length} lapsed policies (page ${page}/${totalPages}, total: ${total})`);
        return { total, page, pageSize, totalPages, records };
      }
    } catch (error) {
      console.error('❌ [Lapsation] Error in getPolicies:', error);
      throw error;
    }
  }

  async getMissedMonths(q: PremiumQueryParams) {
    try {
      const years = resolveYears(q);
      const months = resolveMonths(q);
      const dateField = q.dateMode === 'payment' ? 'last_payment_date' : 'effective_date';
      const page = q.page ? +q.page : 1;
      const pageSize = q.pageSize ? +q.pageSize : 500;

      // Build query to get policies with missed payments
      const qb = this.policyRepo
        .createQueryBuilder('pol')
        .select([
          'pol.policy_number as "PolicyNumber"',
          'pol.effective_date as "EffectiveDate"',
          'pol.premium as "Premium"',
          'pol.contract_duration as "ContractDuration"',
          'COALESCE(pol.total_premium_paid, 0) as "TotalPremiumPaid"',
          'pol.last_payment_date as "LastPaymentDate"',
        ])
        .where(`pol.${dateField} IS NOT NULL`)
        .andWhere(yearCondition('pol', dateField, years))
        .andWhere('pol.premium > COALESCE(pol.total_premium_paid, 0)');

      // Filter policies by effective date month
      if (months) {
        qb.andWhere(monthCondition('pol', dateField, months));
      }

      if (q.product) {
        qb.andWhere('pol.product_code = :product', { product: q.product });
      }

      if (q.state) {
        qb.innerJoin(Premium, 'p', 'p."PolicyNumber" = pol.policy_number AND p."State" = :state', { state: q.state });
      }

      // Filter by specific policies if provided
      if (q.policies) {
        const policiesList = typeof q.policies === 'string' ? q.policies.split(',').filter(Boolean) : q.policies;
        if (policiesList.length > 0) {
          qb.andWhere('pol.policy_number IN (:...policies)', { policies: policiesList });
        }
      }

      const policies = await qb.getRawMany();

      // Generate missed months for each policy
      const allMissedMonths: { PolicyNumber: string; dateMissed: string; premium: number }[] = [];

      for (const policy of policies) {
        const effectiveDate = new Date(policy.EffectiveDate);
        const annualPremium = +policy.Premium || 0;
        const contractDuration = +policy.ContractDuration || 1;
        const monthlyPremium = annualPremium / 12;
        const totalPaid = +policy.TotalPremiumPaid || 0;
        
        // Calculate expected vs paid months
        const now = new Date();
        const monthsSinceEffective = Math.floor((now.getTime() - effectiveDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
        const contractMonths = contractDuration * 12;
        const expectedMonths = Math.min(monthsSinceEffective, contractMonths);
        const paidMonths = Math.floor(totalPaid / monthlyPremium);
        const missedCount = Math.max(0, expectedMonths - paidMonths);

        // Generate ALL missed month entries (don't filter by month)
        for (let i = 0; i < missedCount; i++) {
          const missedDate = new Date(effectiveDate);
          missedDate.setMonth(missedDate.getMonth() + paidMonths + i);
          
          if (missedDate <= now) {
            allMissedMonths.push({
              PolicyNumber: policy.PolicyNumber,
              dateMissed: missedDate.toISOString().split('T')[0],
              premium: Number(monthlyPremium.toFixed(2)),
            });
          }
        }
      }

      // Sort by date descending
      allMissedMonths.sort((a, b) => b.dateMissed.localeCompare(a.dateMissed));

      // Pagination
      const total = allMissedMonths.length;
      const totalPages = Math.ceil(total / pageSize);
      const records = allMissedMonths.slice((page - 1) * pageSize, page * pageSize);

      console.log(`✅ [Lapsation API] Generated ${records.length} missed months (page ${page}/${totalPages}, total: ${total})`);
      return { 
        total, 
        page, 
        pageSize, 
        totalPages, 
        records: records.map(r => ({
          ...r,
          premium: Number(r.premium)
        }))
      };
    } catch (error) {
      console.error('❌ [Lapsation] Error in getMissedMonths:', error);
      throw error;
    }
  }

  async getMissedPremiumCount(q: PremiumQueryParams) {
    try {
      const years = resolveYears(q);
      const months = resolveMonths(q);

      let query = `
        WITH policy_payments AS (
          SELECT 
            p."PolicyNumber",
            p."EffectDate" as effective_date,
            p."PaymentExpiryDate" as payment_expiry_date,
            p."Premium" as annual_premium,
            p."PaymentDate"
          FROM premium p
          WHERE p."EffectDate" IS NOT NULL
            AND p."Premium" IS NOT NULL
            AND p."Premium" > 0
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (years && years.length > 0) {
        query += ` AND EXTRACT(YEAR FROM p."EffectDate") = ANY($${paramIndex}::int[])`;
        params.push(years);
        paramIndex++;
      }

      if (q.product) {
        query += ` AND p."Product" = $${paramIndex}`;
        params.push(q.product);
        paramIndex++;
      }

      if (q.state) {
        query += ` AND p."State" = $${paramIndex}`;
        params.push(q.state);
        paramIndex++;
      }

      query += `
        ),
        policy_data AS (
          SELECT DISTINCT ON ("PolicyNumber")
            "PolicyNumber",
            effective_date,
            payment_expiry_date,
            annual_premium
          FROM policy_payments
        ),
        expected_months AS (
          SELECT 
            pd."PolicyNumber",
            pd.annual_premium / 12 as monthly_premium,
            generate_series(
              pd.effective_date,
              LEAST(
                COALESCE(pd.payment_expiry_date, pd.effective_date + interval '100 years'),
                CURRENT_DATE
              ),
              interval '1 month'
            )::date AS expected_month_start
          FROM policy_data pd
        ),
        paid_months AS (
          SELECT DISTINCT
            pp."PolicyNumber",
            date_trunc('month', pp."PaymentDate")::date as paid_month
          FROM policy_payments pp
          WHERE pp."PaymentDate" IS NOT NULL
        ),
        missed_by_policy AS (
          SELECT 
            em."PolicyNumber",
            COUNT(*) as missed_months,
            SUM(em.monthly_premium) as missed_amount
          FROM expected_months em
          LEFT JOIN paid_months pm ON 
            em."PolicyNumber" = pm."PolicyNumber" 
            AND date_trunc('month', em.expected_month_start) = pm.paid_month
          WHERE pm.paid_month IS NULL
          GROUP BY em."PolicyNumber"
        )
        SELECT 
          COALESCE(SUM(missed_months), 0)::int as count,
          COALESCE(SUM(missed_amount), 0)::numeric as amount,
          COUNT(DISTINCT "PolicyNumber")::int as policies
        FROM missed_by_policy
        WHERE missed_months > 0
      `;

      const result = await this.premiumRepo.query(query, params);
      const row = result[0] || { count: 0, amount: 0, policies: 0 };

      return {
        count: +row.count || 0,
        amount: +row.amount || 0,
        policies: +row.policies || 0,
      };
    } catch (error) {
      console.error('❌ [Lapsation] Error in getMissedPremiumCount:', error);
      throw error;
    }
  }
}
