'use client';

import { useState, useMemo } from 'react';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const BE_OFFSET = 543;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isoFromParts(year: number, month: number, day: number): string {
  // year is Christian Era (ค.ศ.) here; month is 1-12
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseIso(value: string | null | undefined): { y: number; m: number; d: number } | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  return { y: parseInt(m[1], 10), m: parseInt(m[2], 10), d: parseInt(m[3], 10) };
}

function daysInMonth(year: number, month: number): number {
  // month is 1-12; trick: day 0 of next month = last day of current month
  return new Date(year, month, 0).getDate();
}

interface Props {
  /** Form field name — hidden input emits ISO `YYYY-MM-DD` (Christian Era) */
  name: string;
  /** Initial value as ISO YYYY-MM-DD (Christian Era) */
  defaultValue?: string | null;
  /** HTML id for accessibility */
  id?: string;
  /** Minimum year (Christian Era). Default: today's year - 100 */
  minYear?: number;
  /** Maximum year (Christian Era). Default: today's year + 5 */
  maxYear?: number;
}

/**
 * Thai date picker — displays dd/mm/yyyy with year in Buddhist Era (พ.ศ.)
 * Submits ISO `YYYY-MM-DD` in Christian Era via a hidden input so the
 * server action receives a normal date.
 */
export function ThaiDateInput({ name, defaultValue, id, minYear, maxYear }: Props) {
  const today = new Date();
  const initialParsed = parseIso(defaultValue ?? null);

  const [day, setDay] = useState<number | ''>(initialParsed?.d ?? '');
  const [month, setMonth] = useState<number | ''>(initialParsed?.m ?? '');
  const [year, setYear] = useState<number | ''>(initialParsed?.y ?? '');

  const _minYear = minYear ?? today.getFullYear() - 100;
  const _maxYear = maxYear ?? today.getFullYear() + 5;

  const years = useMemo(() => {
    // Descending — newest year first, more practical for birthdate picking
    const ys: number[] = [];
    for (let y = _maxYear; y >= _minYear; y--) ys.push(y);
    return ys;
  }, [_minYear, _maxYear]);

  // Cap day if month/year change makes current day invalid (e.g. Feb 30 → Feb 28)
  const maxDay = year !== '' && month !== '' ? daysInMonth(year, month) : 31;
  const days = useMemo(() => {
    const ds: number[] = [];
    for (let d = 1; d <= maxDay; d++) ds.push(d);
    return ds;
  }, [maxDay]);

  // If day exceeds maxDay after month change, clamp
  if (day !== '' && day > maxDay) {
    setDay(maxDay);
  }

  const isoValue =
    day !== '' && month !== '' && year !== ''
      ? isoFromParts(year, month, day)
      : '';

  const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm ' +
    'ring-offset-background focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="grid grid-cols-[1fr_1.4fr_1fr] gap-2">
      {/* Day */}
      <select
        id={id}
        className={selectClass}
        value={day}
        onChange={(e) => setDay(e.target.value ? parseInt(e.target.value, 10) : '')}
        aria-label="วัน"
      >
        <option value="">วัน</option>
        {days.map((d) => (
          <option key={d} value={d}>{pad2(d)}</option>
        ))}
      </select>

      {/* Month */}
      <select
        className={selectClass}
        value={month}
        onChange={(e) => setMonth(e.target.value ? parseInt(e.target.value, 10) : '')}
        aria-label="เดือน"
      >
        <option value="">เดือน</option>
        {THAI_MONTHS.map((label, idx) => (
          <option key={idx + 1} value={idx + 1}>{label}</option>
        ))}
      </select>

      {/* Year — display as พ.ศ., store as ค.ศ. */}
      <select
        className={selectClass}
        value={year}
        onChange={(e) => setYear(e.target.value ? parseInt(e.target.value, 10) : '')}
        aria-label="ปี (พ.ศ.)"
      >
        <option value="">ปี พ.ศ.</option>
        {years.map((y) => (
          <option key={y} value={y}>{y + BE_OFFSET}</option>
        ))}
      </select>

      {/* Hidden ISO input that the form actually submits */}
      <input type="hidden" name={name} value={isoValue} />
    </div>
  );
}
