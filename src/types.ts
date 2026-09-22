/** Priorität eines Urlaubswunsches. 'fixed' ist bereits verbindlich zugesagt. */
export type Priority = 'fixed' | 'high' | 'normal'

export interface Employee {
  id: string
  name: string
  /** Individuelles Kontingent an Urlaubswochen für das Planungsjahr. */
  maxVacationWeeks: number
}

export interface VacationRequest {
  id: string
  employeeId: string
  year: number
  /** Erste gewünschte Kalenderwoche (inklusive). */
  startWeek: number
  /** Letzte gewünschte Kalenderwoche (inklusive). */
  endWeek: number
  priority: Priority
  note?: string
}

export interface Constraints {
  /** Max. Anzahl an Mitarbeitern, die gleichzeitig (in derselben KW) auf Urlaub sein dürfen. */
  maxConcurrentEmployees: number
  /** Maximale durchgängige Urlaubsdauer in Wochen. */
  maxConsecutiveWeeks: number
}

export type AssignmentStatus = 'as-requested' | 'alternative' | 'unresolved'

export interface AssignedVacation {
  requestId: string
  employeeId: string
  priority: Priority
  originalStartWeek: number
  originalEndWeek: number
  /** Zugewiesene Wochen. Bei 'unresolved' identisch mit dem Wunsch, aber nicht tatsächlich eingeplant. */
  startWeek: number
  endWeek: number
  status: AssignmentStatus
  /** Verschiebung in Wochen gegenüber dem Wunsch (positiv = später, negativ = früher). */
  shiftWeeks: number
  reason?: string
}

export interface PlanningWarning {
  message: string
  employeeId?: string
  requestId?: string
}

export interface PlanningResult {
  year: number
  weeksInYear: number
  assignments: AssignedVacation[]
  warnings: PlanningWarning[]
  score: number
}

export interface PlanningData {
  version: 1
  year: number
  employees: Employee[]
  requests: VacationRequest[]
  constraints: Constraints
}

export const DEFAULT_CONSTRAINTS: Constraints = {
  maxConcurrentEmployees: 2,
  maxConsecutiveWeeks: 2,
}
