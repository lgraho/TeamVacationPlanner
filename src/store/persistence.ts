import type { PlanningData } from '../types'
import { DEFAULT_CONSTRAINTS } from '../types'

const STORAGE_KEY = 'urlaubsplaner:data:v2'

export function defaultPlanningData(startYear: number): PlanningData {
  return {
    version: 2,
    startYear,
    startMonth: 2,
    employees: [],
    requests: [],
    constraints: { ...DEFAULT_CONSTRAINTS },
  }
}

export function loadPlanningData(): PlanningData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PlanningData
    if (!isPlanningData(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export function savePlanningData(data: PlanningData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage kann z.B. im privaten Modus nicht verfügbar sein – Speichern wird stillschweigend übersprungen.
  }
}

export function exportPlanningDataToFile(data: PlanningData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `urlaubsplaner-${data.startYear}-${String(data.startMonth).padStart(2, '0')}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function parsePlanningDataFile(text: string): PlanningData {
  const parsed = JSON.parse(text) as PlanningData
  if (!isPlanningData(parsed)) {
    throw new Error('Ungültiges Dateiformat')
  }
  return parsed
}

function isPlanningData(value: PlanningData): boolean {
  return (
    value.version === 2 &&
    Number.isInteger(value.startYear) &&
    value.startYear >= 2000 &&
    value.startYear <= 2100 &&
    Number.isInteger(value.startMonth) &&
    value.startMonth >= 1 &&
    value.startMonth <= 12 &&
    Array.isArray(value.employees) &&
    Array.isArray(value.requests) &&
    typeof value.constraints === 'object' &&
    value.constraints !== null
  )
}
