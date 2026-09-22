import type { PlanningData } from '../types'
import { DEFAULT_CONSTRAINTS } from '../types'

const STORAGE_KEY = 'urlaubsplaner:data'

export function defaultPlanningData(year: number): PlanningData {
  return {
    version: 1,
    year,
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
    if (parsed.version !== 1) return null
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
  a.download = `urlaubsplaner-${data.year}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function parsePlanningDataFile(text: string): PlanningData {
  const parsed = JSON.parse(text) as PlanningData
  if (parsed.version !== 1 || !Array.isArray(parsed.employees) || !Array.isArray(parsed.requests)) {
    throw new Error('Ungültiges Dateiformat')
  }
  return parsed
}
