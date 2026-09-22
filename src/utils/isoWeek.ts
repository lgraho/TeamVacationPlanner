import {
  addMonths,
  addWeeks,
  endOfMonth,
  getISOWeek,
  getISOWeekYear,
  startOfISOWeek,
  endOfISOWeek,
} from 'date-fns'
import type { PlanningWeek } from '../types'

/** Alle ISO-Wochen, die den zwölfmonatigen Planungszeitraum berühren. */
export function planningWeeks(startYear: number, startMonth: number): PlanningWeek[] {
  const periodStart = new Date(startYear, startMonth - 1, 1)
  const periodEnd = endOfMonth(addMonths(periodStart, 11))
  const firstMonday = startOfISOWeek(periodStart)
  const lastMonday = startOfISOWeek(periodEnd)
  const weeks: PlanningWeek[] = []

  for (let start = firstMonday, index = 1; start <= lastMonday; start = addWeeks(start, 1), index++) {
    weeks.push({
      index,
      isoYear: getISOWeekYear(start),
      isoWeek: getISOWeek(start),
      start,
      end: endOfISOWeek(start),
    })
  }
  return weeks
}

export function formatDateShort(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.`
}

export function planningWeekLabel(week: PlanningWeek, includeYear = true): string {
  const year = includeYear ? `/${week.isoYear}` : ''
  return `KW ${week.isoWeek}${year} (${formatDateShort(week.start)}–${formatDateShort(week.end)})`
}

export function planningPeriodLabel(startYear: number, startMonth: number): string {
  const start = new Date(startYear, startMonth - 1, 1)
  const end = endOfMonth(addMonths(start, 11))
  const formatter = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })
  return `${formatter.format(start)} – ${formatter.format(end)}`
}

export function planningWeekRangeLabel(
  weeks: PlanningWeek[],
  startIndex: number,
  endIndex: number,
): string {
  const start = weeks[startIndex - 1]
  const end = weeks[endIndex - 1]
  if (!start || !end) return ''
  return `${formatDateShort(start.start)}${start.start.getFullYear()}–${formatDateShort(end.end)}${end.end.getFullYear()}`
}

export function planningWeekCodeRange(
  weeks: PlanningWeek[],
  startIndex: number,
  endIndex: number,
): string {
  const start = weeks[startIndex - 1]
  const end = weeks[endIndex - 1]
  if (!start || !end) return '–'
  const startLabel = `KW ${start.isoWeek}/${start.isoYear}`
  const endLabel = `KW ${end.isoWeek}/${end.isoYear}`
  return startIndex === endIndex ? startLabel : `${startLabel}–${endLabel}`
}
