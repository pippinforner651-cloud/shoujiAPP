/**
 * 跑步日历服务
 *
 * 根据 activities 记录生成月份热力图数据。
 */

import type { RunRecord } from '../types/run';

export interface CalendarDay {
  date: string;
  day: number;
  distanceKm: number;
  /** 热力等级 0-4 */
  heatLevel: 0 | 1 | 2 | 3 | 4;
}

export function getCalendarMonth(records: RunRecord[], year: number, month: number): {
  days: CalendarDay[];
  firstDayOfWeek: number;
  daysInMonth: number;
} {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: CalendarDay[] = [];

  // 按日期聚合跑量
  const runMap = new Map<string, number>();
  for (const r of records) {
    if (r.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) {
      runMap.set(r.date, (runMap.get(r.date) || 0) + r.distanceKm);
    }
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dist = runMap.get(dateStr) || 0;
    let heatLevel: CalendarDay['heatLevel'] = 0;
    if (dist > 10) heatLevel = 4;
    else if (dist > 5) heatLevel = 3;
    else if (dist > 1) heatLevel = 2;
    else if (dist > 0) heatLevel = 1;

    days.push({ date: dateStr, day: d, distanceKm: Math.round(dist * 100) / 100, heatLevel });
  }

  return { days, firstDayOfWeek: firstDay, daysInMonth };
}

export function getHeatColor(level: number): string {
  switch (level) {
    case 0: return 'transparent';
    case 1: return 'rgba(76, 175, 80, 0.15)';
    case 2: return 'rgba(76, 175, 80, 0.35)';
    case 3: return 'rgba(76, 175, 80, 0.55)';
    case 4: return 'rgba(76, 175, 80, 0.8)';
    default: return 'transparent';
  }
}
