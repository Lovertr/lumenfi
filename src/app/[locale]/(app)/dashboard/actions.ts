'use server';

import { getIncomeExpenseTimeSeries, type Granularity } from '@/lib/queries/time-series';

export async function fetchIncomeExpenseTimeSeries(
  granularity: Granularity,
  fromDate: string,
  toDate: string
) {
  return await getIncomeExpenseTimeSeries(granularity, fromDate, toDate, 'th');
}
