/**
 * Pay-cycle math. If user sets `pay_cycle_day` in profile, the "month"
 * is anchored to that day (e.g. salary on 25th → "งวด พ.ค." = 25 เม.ย. - 24 พ.ค.).
 * If null, fall back to calendar month.
 */

export interface CycleRange {
  /** Inclusive ISO date (YYYY-MM-DD) — first day of the cycle */
  startDate: string;
  /** Inclusive ISO date (YYYY-MM-DD) — last day of the cycle */
  endDate: string;
  /** Display label: "งวด พ.ค." or "พ.ค. 2026" */
  label: string;
  /** Long label: "25 เม.ย. - 24 พ.ค. 2026" or "1 - 31 พ.ค. 2026" */
  rangeLabel: string;
  /** True if this is a pay cycle (not calendar month) */
  isPayCycle: boolean;
}

const TH_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

function fmtIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function thMonthYear(d: Date): string {
  return `${TH_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
}

/** Clamp a "day of month" to the actual last day of that month
 * (e.g. day=31 in Feb → 28/29). Returns a new Date at midnight local. */
function clampDay(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

/** Get the cycle containing `ref`. */
export function getCycleForDate(anchor: number | null | undefined, ref: Date = new Date()): CycleRange {
  // Calendar month fallback
  if (anchor == null || anchor < 1 || anchor > 31) {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    return {
      startDate: fmtIso(start),
      endDate: fmtIso(end),
      label: thMonthYear(ref),
      rangeLabel: `${start.getDate()} - ${end.getDate()} ${thMonthYear(end)}`,
      isPayCycle: false,
    };
  }

  // Pay cycle: cycle starts on `anchor` day. Find which cycle `ref` falls in.
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const d = ref.getDate();

  let cycleStart: Date;
  if (d >= anchor) {
    // Current month cycle started on `anchor` of this month
    cycleStart = clampDay(y, m, anchor);
  } else {
    // We're before this month's anchor → cycle started last month
    cycleStart = clampDay(y, m - 1, anchor);
  }
  // Cycle ends day before next cycle starts
  const nextStart = clampDay(cycleStart.getFullYear(), cycleStart.getMonth() + 1, anchor);
  const cycleEnd = new Date(nextStart.getFullYear(), nextStart.getMonth(), nextStart.getDate() - 1);

  // Label: "งวด <month of cycle end>" — i.e. งวด พ.ค. covers 25 เม.ย. - 24 พ.ค.
  const labelMonth = TH_MONTHS_SHORT[cycleEnd.getMonth()];
  const labelYear = cycleEnd.getFullYear() + 543;

  return {
    startDate: fmtIso(cycleStart),
    endDate: fmtIso(cycleEnd),
    label: `งวด ${labelMonth} ${labelYear}`,
    rangeLabel: cycleStart.getMonth() === cycleEnd.getMonth()
      ? `${cycleStart.getDate()} - ${cycleEnd.getDate()} ${TH_MONTHS_SHORT[cycleEnd.getMonth()]} ${labelYear}`
      : `${cycleStart.getDate()} ${TH_MONTHS_SHORT[cycleStart.getMonth()]} - ${cycleEnd.getDate()} ${TH_MONTHS_SHORT[cycleEnd.getMonth()]} ${labelYear}`,
    isPayCycle: true,
  };
}

/** Current cycle (containing today). */
export function getCurrentCycle(anchor: number | null | undefined): CycleRange {
  return getCycleForDate(anchor, new Date());
}

/** Previous cycle (one before current). */
export function getPreviousCycle(anchor: number | null | undefined): CycleRange {
  const current = getCurrentCycle(anchor);
  // Go to day before current.startDate
  const startD = new Date(current.startDate);
  const prevRef = new Date(startD.getTime() - 86400000);
  return getCycleForDate(anchor, prevRef);
}
