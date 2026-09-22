import { describe, expect, it } from 'vitest'
import { solvePlanning } from './solver'
import { weeksInYear } from '../utils/isoWeek'
import type { Constraints, Employee, VacationRequest } from '../types'

const constraints: Constraints = { maxConcurrentEmployees: 2, maxConsecutiveWeeks: 2 }

function makeEmployees(names: string[], maxVacationWeeks = 6): Employee[] {
  return names.map((name, i) => ({ id: `e${i + 1}`, name, maxVacationWeeks }))
}

describe('solvePlanning', () => {
  it('places non-conflicting requests exactly as requested', () => {
    const employees = makeEmployees(['Anna', 'Bert'])
    const requests: VacationRequest[] = [
      { id: 'r1', employeeId: 'e1', year: 2026, startWeek: 10, endWeek: 11, priority: 'normal' },
      { id: 'r2', employeeId: 'e2', year: 2026, startWeek: 20, endWeek: 20, priority: 'normal' },
    ]
    const result = solvePlanning(2026, employees, requests, constraints)
    expect(result.assignments.every((a) => a.status === 'as-requested')).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  it('always honors fixed requests even if they violate concurrency, and warns', () => {
    const employees = makeEmployees(['A', 'B', 'C'])
    const requests: VacationRequest[] = [
      { id: 'r1', employeeId: 'e1', year: 2026, startWeek: 5, endWeek: 5, priority: 'fixed' },
      { id: 'r2', employeeId: 'e2', year: 2026, startWeek: 5, endWeek: 5, priority: 'fixed' },
      { id: 'r3', employeeId: 'e3', year: 2026, startWeek: 5, endWeek: 5, priority: 'fixed' },
    ]
    const result = solvePlanning(2026, employees, requests, constraints)
    expect(result.assignments.every((a) => a.status === 'as-requested')).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('finds the nearest alternative when the exact week is blocked by concurrency', () => {
    const employees = makeEmployees(['A', 'B', 'C'])
    const requests: VacationRequest[] = [
      { id: 'r1', employeeId: 'e1', year: 2026, startWeek: 10, endWeek: 10, priority: 'fixed' },
      { id: 'r2', employeeId: 'e2', year: 2026, startWeek: 10, endWeek: 10, priority: 'fixed' },
      { id: 'r3', employeeId: 'e3', year: 2026, startWeek: 10, endWeek: 10, priority: 'normal' },
    ]
    const result = solvePlanning(2026, employees, requests, constraints)
    const alt = result.assignments.find((a) => a.requestId === 'r3')!
    expect(alt.status).toBe('alternative')
    expect(Math.abs(alt.shiftWeeks)).toBe(1)
  })

  it('respects max consecutive vacation weeks', () => {
    const employees = makeEmployees(['A'])
    const requests: VacationRequest[] = [
      { id: 'r1', employeeId: 'e1', year: 2026, startWeek: 1, endWeek: 2, priority: 'normal' },
      { id: 'r2', employeeId: 'e1', year: 2026, startWeek: 3, endWeek: 3, priority: 'normal' },
    ]
    const result = solvePlanning(2026, employees, requests, constraints)
    const second = result.assignments.find((a) => a.requestId === 'r2')!
    // Wochen 1-3 wären 3 Wochen am Stück -> verletzt maxConsecutiveWeeks=2, muss verschoben werden
    expect(second.startWeek).not.toBe(3)
  })

  it('respects individual employee vacation week cap', () => {
    const employees: Employee[] = [{ id: 'e1', name: 'A', maxVacationWeeks: 2 }]
    const requests: VacationRequest[] = [
      { id: 'r1', employeeId: 'e1', year: 2026, startWeek: 1, endWeek: 2, priority: 'normal' },
      { id: 'r2', employeeId: 'e1', year: 2026, startWeek: 10, endWeek: 10, priority: 'normal' },
    ]
    const result = solvePlanning(2026, employees, requests, constraints)
    const second = result.assignments.find((a) => a.requestId === 'r2')!
    expect(second.status).toBe('unresolved')
  })

  it('marks a request unresolved when no alternative exists in the whole year', () => {
    const employees = makeEmployees(['A', 'B', 'C'], 60)
    const requests: VacationRequest[] = []
    const totalWeeks = weeksInYear(2026)
    // Block every single week for A and B with fixed requests so C can never get any week.
    for (let w = 1; w <= totalWeeks; w++) {
      requests.push({ id: `fa${w}`, employeeId: 'e1', year: 2026, startWeek: w, endWeek: w, priority: 'fixed' })
    }
    requests.push({ id: 'rc', employeeId: 'e3', year: 2026, startWeek: 30, endWeek: 30, priority: 'normal' })
    const withB = [...requests]
    for (let w = 1; w <= totalWeeks; w++) {
      withB.push({ id: `fb${w}`, employeeId: 'e2', year: 2026, startWeek: w, endWeek: w, priority: 'fixed' })
    }
    const result = solvePlanning(2026, employees, withB, { maxConcurrentEmployees: 2, maxConsecutiveWeeks: 60 })
    const rc = result.assignments.find((a) => a.requestId === 'rc')!
    expect(rc.status).toBe('unresolved')
  })
})
