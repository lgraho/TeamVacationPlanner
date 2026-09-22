import type {
  AssignedVacation,
  AssignmentStatus,
  Constraints,
  Employee,
  PlanningResult,
  PlanningWeek,
  PlanningWarning,
  Priority,
  VacationRequest,
} from '../types'
import { planningWeekLabel } from '../utils/isoWeek'

const PRIORITY_WEIGHT: Record<Priority, number> = {
  fixed: 1_000_000,
  high: 1_000,
  normal: 1,
}

interface EmployeeState {
  weeks: Set<number>
  /** Zusammenhängende, bereits belegte Wochenblöcke, sortiert nach Start. */
  blocks: Array<[number, number]>
}

/**
 * Interner Solver-Zustand: hält Belegungen pro Mitarbeiter und die
 * Gesamtanzahl gleichzeitig abwesender Mitarbeiter pro Kalenderwoche.
 */
class SolverState {
  readonly weeksTotal: number
  readonly employeeStates = new Map<string, EmployeeState>()
  readonly weekCounts: number[]
  readonly weeks: PlanningWeek[]

  constructor(weeks: PlanningWeek[], employees: Employee[]) {
    this.weeks = weeks
    this.weeksTotal = weeks.length
    this.weekCounts = new Array(weeks.length + 1).fill(0)
    for (const e of employees) {
      this.employeeStates.set(e.id, { weeks: new Set(), blocks: [] })
    }
  }

  private mergedRunLength(employeeId: string, start: number, end: number): number {
    const st = this.employeeStates.get(employeeId)!
    let runStart = start
    let runEnd = end
    for (const [bStart, bEnd] of st.blocks) {
      if (bEnd === start - 1) runStart = Math.min(runStart, bStart)
      if (bStart === end + 1) runEnd = Math.max(runEnd, bEnd)
    }
    return runEnd - runStart + 1
  }

  /** Prüft, ob ein Block platziert werden darf; liefert Liste verletzter Regeln (leer = ok). */
  checkViolations(
    employee: Employee,
    start: number,
    end: number,
    constraints: Constraints,
  ): string[] {
    const violations: string[] = []
    const st = this.employeeStates.get(employee.id)!

    for (let w = start; w <= end; w++) {
      if (st.weeks.has(w)) {
        violations.push('Überschneidung mit bereits verplantem Urlaub desselben Mitarbeiters')
        break
      }
    }

    const currentTotal = st.weeks.size
    const additional = end - start + 1
    if (currentTotal + additional > employee.maxVacationWeeks) {
      violations.push(
        `Individuelles Wochenkontingent (${employee.maxVacationWeeks}) würde überschritten`,
      )
    }

    const runLength = this.mergedRunLength(employee.id, start, end)
    if (runLength > constraints.maxConsecutiveWeeks) {
      violations.push(
        `Maximale durchgängige Urlaubsdauer (${constraints.maxConsecutiveWeeks} Wochen) würde überschritten`,
      )
    }

    for (let w = start; w <= end; w++) {
      if (this.weekCounts[w] + 1 > constraints.maxConcurrentEmployees) {
        violations.push(
          `Max. Anzahl gleichzeitig abwesender Mitarbeiter (${constraints.maxConcurrentEmployees}) in ${planningWeekLabel(this.weeks[w - 1], false)} würde überschritten`,
        )
        break
      }
    }

    return violations
  }

  canPlace(employee: Employee, start: number, end: number, constraints: Constraints): boolean {
    if (start < 1 || end > this.weeksTotal || start > end) return false
    return this.checkViolations(employee, start, end, constraints).length === 0
  }

  place(employeeId: string, start: number, end: number): void {
    const st = this.employeeStates.get(employeeId)!
    for (let w = start; w <= end; w++) {
      st.weeks.add(w)
      this.weekCounts[w] += 1
    }
    st.blocks.push([start, end])
    st.blocks.sort((a, b) => a[0] - b[0])
  }

  clone(): SolverState {
    const copy = new SolverState(this.weeks, [])
    for (const [id, st] of this.employeeStates) {
      copy.employeeStates.set(id, { weeks: new Set(st.weeks), blocks: st.blocks.map((b) => [...b] as [number, number]) })
    }
    copy.weekCounts.splice(0, copy.weekCounts.length, ...this.weekCounts)
    return copy
  }
}

type OrderStrategy = (requests: VacationRequest[]) => VacationRequest[]

function byStartAsc(requests: VacationRequest[]): VacationRequest[] {
  return [...requests].sort((a, b) => a.startWeek - b.startWeek || a.id.localeCompare(b.id))
}

function byLengthAsc(requests: VacationRequest[]): VacationRequest[] {
  return [...requests].sort(
    (a, b) =>
      a.endWeek - a.startWeek - (b.endWeek - b.startWeek) ||
      a.startWeek - b.startWeek ||
      a.id.localeCompare(b.id),
  )
}

function byLengthDesc(requests: VacationRequest[]): VacationRequest[] {
  return [...requests].sort(
    (a, b) =>
      b.endWeek - b.startWeek - (a.endWeek - a.startWeek) ||
      a.startWeek - b.startWeek ||
      a.id.localeCompare(b.id),
  )
}

function byEmployeeThenStart(requests: VacationRequest[]): VacationRequest[] {
  return [...requests].sort(
    (a, b) => a.employeeId.localeCompare(b.employeeId) || a.startWeek - b.startWeek,
  )
}

function byStartDesc(requests: VacationRequest[]): VacationRequest[] {
  return [...requests].sort((a, b) => b.startWeek - a.startWeek || a.id.localeCompare(b.id))
}

const ORDER_STRATEGIES: OrderStrategy[] = [
  byStartAsc,
  byLengthAsc,
  byLengthDesc,
  byEmployeeThenStart,
  byStartDesc,
]

/** Sucht ausgehend vom Wunschtermin die nächstgelegene freie Alternative gleicher Länge. */
function findNearestAlternative(
  state: SolverState,
  employee: Employee,
  start: number,
  end: number,
  constraints: Constraints,
): { start: number; end: number } | null {
  const length = end - start + 1
  const weeksTotal = state.weeksTotal
  for (let distance = 1; distance <= weeksTotal; distance++) {
    for (const dir of [-1, 1]) {
      const newStart = start + dir * distance
      const newEnd = newStart + length - 1
      if (newStart < 1 || newEnd > weeksTotal) continue
      if (state.canPlace(employee, newStart, newEnd, constraints)) {
        return { start: newStart, end: newEnd }
      }
    }
  }
  return null
}

function scoreAssignment(a: AssignedVacation, weeksTotal: number): number {
  const weight = PRIORITY_WEIGHT[a.priority]
  if (a.status === 'as-requested') return weight
  if (a.status === 'alternative') {
    const penalty = Math.min(1, Math.abs(a.shiftWeeks) / weeksTotal)
    return weight * (1 - 0.5 * penalty)
  }
  return 0
}

function runSingleStrategy(
  weeks: PlanningWeek[],
  employees: Employee[],
  requests: VacationRequest[],
  constraints: Constraints,
  order: OrderStrategy,
): PlanningResult {
  const weeksTotal = weeks.length
  const employeeById = new Map(employees.map((e) => [e.id, e]))
  const state = new SolverState(weeks, employees)
  const warnings: PlanningWarning[] = []
  const assignments: AssignedVacation[] = []

  const fixed = requests.filter((r) => r.priority === 'fixed')
  const nonFixed = requests.filter((r) => r.priority !== 'fixed')
  const highThenNormal = [
    ...order(nonFixed.filter((r) => r.priority === 'high')),
    ...order(nonFixed.filter((r) => r.priority === 'normal')),
  ]

  // 1. Fixierte Wünsche sind bereits verbindlich zugesagt: unbedingt platzieren, aber Konflikte melden.
  for (const req of order(fixed)) {
    const employee = employeeById.get(req.employeeId)
    if (!employee) continue
    const violations = state.checkViolations(employee, req.startWeek, req.endWeek, constraints)
    state.place(employee.id, req.startWeek, req.endWeek)
    if (violations.length > 0) {
      for (const v of violations) {
        warnings.push({
          message: `Fixierter Urlaub von ${employee.name} (${formatWeekRange(weeks, req.startWeek, req.endWeek)}): ${v}`,
          employeeId: employee.id,
          requestId: req.id,
        })
      }
    }
    assignments.push({
      requestId: req.id,
      employeeId: employee.id,
      priority: req.priority,
      originalStartWeek: req.startWeek,
      originalEndWeek: req.endWeek,
      startWeek: req.startWeek,
      endWeek: req.endWeek,
      status: 'as-requested',
      shiftWeeks: 0,
    })
  }

  // 2. Hoch- und normal-priorisierte Wünsche: exakt versuchen, sonst nächstgelegene Alternative.
  for (const req of highThenNormal) {
    const employee = employeeById.get(req.employeeId)
    if (!employee) continue

    if (state.canPlace(employee, req.startWeek, req.endWeek, constraints)) {
      state.place(employee.id, req.startWeek, req.endWeek)
      assignments.push({
        requestId: req.id,
        employeeId: employee.id,
        priority: req.priority,
        originalStartWeek: req.startWeek,
        originalEndWeek: req.endWeek,
        startWeek: req.startWeek,
        endWeek: req.endWeek,
        status: 'as-requested',
        shiftWeeks: 0,
      })
      continue
    }

    const alt = findNearestAlternative(state, employee, req.startWeek, req.endWeek, constraints)
    let status: AssignmentStatus
    let startWeek = req.startWeek
    let endWeek = req.endWeek
    let shiftWeeks = 0
    let reason: string | undefined

    if (alt) {
      state.place(employee.id, alt.start, alt.end)
      startWeek = alt.start
      endWeek = alt.end
      shiftWeeks = alt.start - req.startWeek
      status = 'alternative'
    } else {
      status = 'unresolved'
      const violations = state.checkViolations(employee, req.startWeek, req.endWeek, constraints)
      reason = violations.join('; ')
      warnings.push({
        message: `Urlaubswunsch von ${employee.name} (${formatWeekRange(weeks, req.startWeek, req.endWeek)}, ${req.priority}) konnte nicht erfüllt werden: ${reason}`,
        employeeId: employee.id,
        requestId: req.id,
      })
    }

    assignments.push({
      requestId: req.id,
      employeeId: employee.id,
      priority: req.priority,
      originalStartWeek: req.startWeek,
      originalEndWeek: req.endWeek,
      startWeek,
      endWeek,
      status,
      shiftWeeks,
      reason,
    })
  }

  const score = assignments.reduce((sum, a) => sum + scoreAssignment(a, weeksTotal), 0)

  return { weeks, assignments, warnings, score }
}

function formatWeekRange(weeks: PlanningWeek[], start: number, end: number): string {
  const first = weeks[start - 1]
  const last = weeks[end - 1]
  if (!first || !last) return `Planwoche ${start}–${end}`
  const firstLabel = `KW ${first.isoWeek}/${first.isoYear}`
  const lastLabel = `KW ${last.isoWeek}/${last.isoYear}`
  return start === end ? firstLabel : `${firstLabel}–${lastLabel}`
}

/**
 * Berechnet die optimale Urlaubsverteilung. Probiert mehrere Verarbeitungsreihenfolgen
 * durch und wählt das Ergebnis mit der höchsten Gesamtbewertung (erfüllte Prioritäten,
 * möglichst geringe Verschiebung, möglichst wenige unerfüllte Wünsche).
 */
export function solvePlanning(
  weeks: PlanningWeek[],
  employees: Employee[],
  requests: VacationRequest[],
  constraints: Constraints,
): PlanningResult {
  let best: PlanningResult | null = null
  for (const order of ORDER_STRATEGIES) {
    const result = runSingleStrategy(weeks, employees, requests, constraints, order)
    if (
      !best ||
      result.score > best.score ||
      (result.score === best.score &&
        result.assignments.filter((a) => a.status === 'unresolved').length <
          best.assignments.filter((a) => a.status === 'unresolved').length)
    ) {
      best = result
    }
  }
  return best!
}
