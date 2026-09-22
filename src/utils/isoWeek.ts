import {
  getISOWeeksInYear,
  setISOWeek,
  startOfISOWeek,
  endOfISOWeek,
  setISOWeekYear,
  getISOWeek,
  getISOWeekYear,
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

/**
 * Ermittelt zu einem beliebigen Datum die zugehörige ISO-Kalenderwoche innerhalb
 * des angegebenen Planungsjahres. Liegt das Datum ISO-technisch bereits im
 * Vorjahr bzw. Folgejahr (Jahreswechsel-Randtage), wird auf die erste bzw.
 * letzte Woche des Planungsjahres begrenzt.
 */
export function dateToWeekInYear(date: Date, year: number): number {
  const isoYear = getISOWeekYear(date)
  if (isoYear < year) return 1
  if (isoYear > year) return weeksInYear(year)
  return getISOWeek(date)
}

/** Formatiert ein Datum als `yyyy-MM-dd` für `<input type="date">`. */
export function formatDateInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parst den Wert eines `<input type="date">` (`yyyy-MM-dd`) als lokales Datum. */
export function parseDateInput(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}
