import { getISOWeeksInYear, setISOWeek, startOfISOWeek, endOfISOWeek, setISOWeekYear } from 'date-fns'

/** Anzahl der ISO-Kalenderwochen eines Jahres (52 oder 53). */
export function weeksInYear(year: number): number {
  return getISOWeeksInYear(new Date(year, 5, 15))
}

/** Liefert Start- und Enddatum (Mo–So) einer ISO-Kalenderwoche als formatierten String. */
export function weekDateRangeLabel(year: number, week: number): string {
  const base = setISOWeekYear(new Date(year, 5, 15), year)
  const dateInWeek = setISOWeek(base, week)
  const start = startOfISOWeek(dateInWeek)
  const end = endOfISOWeek(dateInWeek)
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`
  return `${fmt(start)}–${fmt(end)}`
}

export function clampWeek(week: number, year: number): number {
  const max = weeksInYear(year)
  return Math.min(Math.max(week, 1), max)
}
