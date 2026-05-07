'use server';

import { getIncomeExpenseTimeSeries, type Granularity } from '@/lib/queries/time-series';

export async function fetchIncomeExpenseTimeSeries(granularity: Granularity, months: number) {
  return await getIncomeExpenseTimeSeries(granularity, months, 'th');
}
