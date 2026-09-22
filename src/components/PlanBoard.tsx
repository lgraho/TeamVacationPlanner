import { useMemo, useState } from 'react'
import { usePlanning } from '../store/PlanningContext'
import { solvePlanning } from '../solver/solver'
import type { PlanningResult } from '../types'
import {
  planningPeriodLabel,
  planningWeekLabel,
  planningWeekRangeLabel,
  planningWeeks,
} from '../utils/isoWeek'
import { employeeColor } from '../utils/colors'
import { STATUS_LABEL } from '../utils/statusLabels'

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

export default function PlanBoard() {
  const { data } = usePlanning()
  const [calculation, setCalculation] = useState<{
    result: PlanningResult
    source: typeof data
  } | null>(null)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const weeks = useMemo(
    () => planningWeeks(data.startYear, data.startMonth),
    [data.startYear, data.startMonth],
  )

  const result = calculation?.source === data ? calculation.result : null

  // Randwochen werden dem gewählten Zeitraum zugeordnet, damit die Überschrift exakt zwölf Monate zeigt.
  const monthGroups = useMemo(() => {
    const groups: { label: string; span: number }[] = []
    for (const week of weeks) {
      const monthDate =
        week.index === 1
          ? new Date(data.startYear, data.startMonth - 1, 1)
          : week.index === weeks.length
            ? new Date(data.startYear, data.startMonth + 10, 1)
            : week.start
      const label = `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`
      const last = groups[groups.length - 1]
      if (last && last.label === label) {
        last.span += 1
      } else {
        groups.push({ label, span: 1 })
      }
    }
    return groups
  }, [weeks, data.startYear, data.startMonth])

  const canCalculate = data.employees.length > 0 && data.requests.length > 0

  const handleCalculate = () => {
    setCalculation({
      result: solvePlanning(weeks, data.employees, data.requests, data.constraints),
      source: data,
    })
  }

  const handleExportExcel = async () => {
    if (!result) return
    setIsExportingExcel(true)
    try {
      const { exportPlanToExcel } = await import('../export/excelExport')
      await exportPlanToExcel(data, result)
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    if (!result) return
    setIsExportingPdf(true)
    try {
      const { exportPlanToPdf } = await import('../export/pdfExport')
      exportPlanToPdf(data, result)
    } finally {
      setIsExportingPdf(false)
    }
  }

  const employeeById = new Map(data.employees.map((e) => [e.id, e]))

  return (
    <section className="panel">
      <h2>Planung: {planningPeriodLabel(data.startYear, data.startMonth)}</h2>
      <div className="toolbar">
        <button onClick={handleCalculate} disabled={!canCalculate}>
          Plan berechnen
        </button>
        {result && (
          <>
            <button onClick={handleExportExcel} disabled={isExportingExcel}>
              {isExportingExcel ? 'Exportiere…' : 'Als Excel exportieren'}
            </button>
            <button onClick={handleExportPdf} disabled={isExportingPdf}>
              {isExportingPdf ? 'Exportiere…' : 'Als PDF exportieren'}
            </button>
          </>
        )}
        {!canCalculate && (
          <span className="hint">Bitte Mitarbeiter und Urlaubswünsche erfassen.</span>
        )}
      </div>

      {result && (
        <>
          {result.warnings.length > 0 && (
            <div className="warnings">
              <h3>Hinweise</h3>
              <ul>
                {result.warnings.map((w, i) => (
                  <li key={i}>{w.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid-scroll">
            <table className="plan-grid">
              <colgroup>
                <col className="employee-column" />
                {weeks.map((week) => (
                  <col key={week.index} className="week-column" />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th className="sticky-col diagonal-header" rowSpan={2}>
                    <span className="diagonal-header-kw">KW</span>
                    <span className="diagonal-header-employee">Mitarbeiter</span>
                  </th>
                  {monthGroups.map((g, i) => (
                    <th key={i} colSpan={g.span} className="month-header">
                      {g.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  {weeks.map((week) => (
                    <th key={week.index} title={planningWeekLabel(week)}>
                      {week.isoWeek}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.employees.map((emp) => {
                  const own = result.assignments.filter(
                    (a) => a.employeeId === emp.id && a.status !== 'unresolved',
                  )
                  const weekStatus = new Map<number, 'as-requested' | 'alternative'>()
                  for (const a of own) {
                    for (let w = a.startWeek; w <= a.endWeek; w++) {
                      weekStatus.set(w, a.status as 'as-requested' | 'alternative')
                    }
                  }
                  const color = employeeColor(emp.id)
                  return (
                    <tr key={emp.id}>
                      <td className="sticky-col">{emp.name}</td>
                      {weeks.map((week) => {
                        const status = weekStatus.get(week.index)
                        return (
                          <td
                            key={week.index}
                            className={status ? `plan-cell ${status}` : 'plan-cell'}
                            style={status ? { background: color, opacity: status === 'alternative' ? 0.55 : 1 } : undefined}
                            title={
                              status
                                ? `${planningWeekLabel(week)}: ${STATUS_LABEL[status]}`
                                : undefined
                            }
                          />
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <h3>Details je Urlaubswunsch</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Mitarbeiter</th>
                <th>Priorität</th>
                <th>Gewünscht</th>
                <th>Zugeteilt</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...result.assignments]
                .sort((a, b) => a.originalStartWeek - b.originalStartWeek)
                .map((a) => (
                  <tr key={a.requestId} className={`status-${a.status}`}>
                    <td>{employeeById.get(a.employeeId)?.name ?? '(gelöscht)'}</td>
                    <td>{a.priority}</td>
                    <td>
                      {formatAssignmentWeeks(weeks, a.originalStartWeek, a.originalEndWeek)}
                      <div className="hint">
                        {planningWeekRangeLabel(weeks, a.originalStartWeek, a.originalEndWeek)}
                      </div>
                    </td>
                    <td>
                      {a.status === 'unresolved'
                        ? '–'
                        : (
                          <>
                            {formatAssignmentWeeks(weeks, a.startWeek, a.endWeek)}
                            <div className="hint">
                              {planningWeekRangeLabel(weeks, a.startWeek, a.endWeek)}
                            </div>
                          </>
                        )}
                      {a.status === 'alternative' && (
                        <span className="hint">
                          {' '}
                          ({a.shiftWeeks > 0 ? '+' : ''}
                          {a.shiftWeeks} Wo.)
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${a.status}`}>{STATUS_LABEL[a.status]}</span>
                      {a.reason && <div className="hint">{a.reason}</div>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}

function formatAssignmentWeeks(weeks: PlanningResult['weeks'], start: number, end: number): string {
  const first = weeks[start - 1]
  const last = weeks[end - 1]
  if (!first || !last) return '–'
  const firstLabel = `KW ${first.isoWeek}/${first.isoYear}`
  const lastLabel = `KW ${last.isoWeek}/${last.isoYear}`
  return start === end ? firstLabel : `${firstLabel}–${lastLabel}`
}
