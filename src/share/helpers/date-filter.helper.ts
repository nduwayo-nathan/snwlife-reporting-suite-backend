import { BaseQueryParams } from '../dto/base-query-params.dto';

export function resolveYears(q: BaseQueryParams): number[] | null {
  if (!q.filterMode) return null;
  if (q.filterMode === 'single') return q.year ? [+q.year] : null;
  if (q.filterMode === 'range') {
    if (!q.startYear || !q.endYear) return null;
    const years: number[] = [];
    for (let y = +q.startYear; y <= +q.endYear; y++) years.push(y);
    return years;
  }
  if (q.filterMode === 'multi') return q.years ? q.years.split(',').map(Number) : null;
  return null;
}

export function yearCondition(alias: string, field: string, years: number[] | null): string {
  if (!years || years.length === 0) return '1=1';
  if (years.length === 1) return `EXTRACT(YEAR FROM ${alias}."${field}"::date) = ${years[0]}`;
  return `EXTRACT(YEAR FROM ${alias}."${field}"::date) IN (${years.join(',')})`;
}

export function monthCondition(alias: string, field: string, months: number[] | null): string {
  if (!months || months.length === 0) return '1=1';
  if (months.length === 1) return `EXTRACT(MONTH FROM ${alias}."${field}"::date) = ${months[0]}`;
  return `EXTRACT(MONTH FROM ${alias}."${field}"::date) IN (${months.join(',')})`;
}

export function resolveMonths(q: { months?: string }): number[] | null {
  if (!q.months) return null;
  const parsed = q.months.split(',').map(Number).filter((n) => n >= 1 && n <= 12);
  return parsed.length ? parsed : null;
}

export function resolveInstallments(q: { installments?: string }): number[] | null {
  if (!q.installments) return null;
  const parsed = q.installments.split(',').map(Number);
  return parsed.length ? parsed : null;
}

export function installmentCondition(alias: string, effectiveDateField: string, targetDateField: string, installments: number[] | null): string {
  if (!installments || installments.length === 0) return '1=1';
  // This would need custom SQL logic to calculate installment number inline
  // For now, return a placeholder that always matches (filtering will happen in code)
  return '1=1';
}

export function getInstallmentNo(effectiveDate: string, targetDate: string): number | null {
  if (!effectiveDate || !targetDate) return null;
  const start = new Date(effectiveDate);
  const target = new Date(targetDate);
  if (isNaN(start.getTime()) || isNaN(target.getTime())) return null;
  
  // Calculate month difference
  const monthDiff =
    (target.getFullYear() - start.getFullYear()) * 12 +
    (target.getMonth() - start.getMonth());
  
  // Installment logic:
  // Same month (diff = 0) → Installment 1
  // Next month (diff = 1) → Installment 2
  // Previous month (diff = -1) → Installment 0 → but we want -1 for payments before
  // So we adjust: if diff >= 0, add 1; if diff < 0, keep as is (or subtract 1?)
  
  // Actually, let's think about it:
  // diff = 0 (same month) → installment 1
  // diff = 1 (1 month after) → installment 2
  // diff = -1 (1 month before) → installment 0 or -1?
  // diff = -2 (2 months before) → installment -1 or -2?
  
  // If we want no zero, then:
  // diff >= 0: installment = diff + 1
  // diff < 0: installment = diff (so -1 stays -1, -2 stays -2)
  
  return monthDiff >= 0 ? monthDiff + 1 : monthDiff;
}