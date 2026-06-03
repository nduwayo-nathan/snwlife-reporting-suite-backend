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
  if (years.length === 1) return `EXTRACT(YEAR FROM ${alias}."${field}") = ${years[0]}`;
  return `EXTRACT(YEAR FROM ${alias}."${field}") IN (${years.join(',')})`;
}

export function getInstallmentNo(effectiveDate: string, targetDate: string): number | null {
  const start = new Date(effectiveDate);
  const target = new Date(targetDate);
  const no =
    (target.getFullYear() - start.getFullYear()) * 12 +
    (target.getMonth() - start.getMonth()) +
    1;
  return no > 0 ? no : null;
}
