import {
  getISOWeeksInYear,
  setISOWeek,
  startOfISOWeek,
  endOfISOWeek,
  setISOWeekYear,
} from 'date-fns'

/** Anzahl der ISO-Kalenderwochen eines Jahres (52 oder 53). */
export function weeksInYear(year: number): number {
  return getISOWeeksInYear(new Date(year, 5, 15))
}

/** Montag (Beginn) einer ISO-Kalenderwoche eines Jahres. */
export function weekStartDate(year: number, week: number): Date {
  const base = setISOWeekYear(new Date(year, 5, 15), year)
  const dateInWeek = setISOWeek(base, week)
  return startOfISOWeek(dateInWeek)
}

/** Sonntag (Ende) einer ISO-Kalenderwoche eines Jahres. */
export function weekEndDate(year: number, week: number): Date {
  const base = setISOWeekYear(new Date(year, 5, 15), year)
  const dateInWeek = setISOWeek(base, week)
  return endOfISOWeek(dateInWeek)
}

/** Liefert Start- und Enddatum (Mo–So) einer ISO-Kalenderwoche als formatierten String. */
export function weekDateRangeLabel(year: number, week: number): string {
  return weekRangeDateLabel(year, week, week)
}

/** Liefert das Datum vom Montag der Startwoche bis zum Sonntag der Endwoche als formatierten String. */
export function weekRangeDateLabel(year: number, startWeek: number, endWeek: number): string {
  const start = weekStartDate(year, startWeek)
  const end = weekEndDate(year, endWeek)
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`
  return `${fmt(start)}–${fmt(end)}`
}

export function clampWeek(week: number, year: number): number {
  const max = weeksInYear(year)
  return Math.min(Math.max(week, 1), max)
}
