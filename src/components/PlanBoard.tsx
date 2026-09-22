import { useMemo, useState } from 'react'
import { usePlanning } from '../store/PlanningContext'
import { solvePlanning } from '../solver/solver'
import type { PlanningResult } from '../types'
import { weeksInYear, weekDateRangeLabel, weekStartDate, weekRangeDateLabel } from '../utils/isoWeek'
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
  const [result, setResult] = useState<PlanningResult | null>(null)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const weeksTotal = weeksInYear(data.year)
  const weekNumbers = useMemo(() => Array.from({ length: weeksTotal }, (_, i) => i + 1), [weeksTotal])

  // Gruppiert die Wochen nach dem Monat ihres Wochenbeginns (Montag) für die Monatsüberschrift im Raster.
  const monthGroups = useMemo(() => {
    const groups: { label: string; span: number }[] = []
    for (const w of weekNumbers) {
      const label = MONTH_NAMES[weekStartDate(data.year, w).getMonth()]
      const last = groups[groups.length - 1]
      if (last && last.label === label) {
        last.span += 1
      } else {
        groups.push({ label, span: 1 })
      }
    }
    return groups
  }, [weekNumbers, data.year])

  const canCalculate = data.employees.length > 0 && data.requests.length > 0

  const handleCalculate = () => {
    setResult(solvePlanning(data.year, data.employees, data.requests, data.constraints))
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
      <h2>Planung {data.year}</h2>
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
          <div className="summary-cards">
            <SummaryCard
              label="Wie gewünscht"
              value={result.assignments.filter((a) => a.status === 'as-requested').length}
            />
            <SummaryCard
              label="Alternativ verschoben"
              value={result.assignments.filter((a) => a.status === 'alternative').length}
            />
            <SummaryCard
              label="Nicht erfüllbar"
              value={result.assignments.filter((a) => a.status === 'unresolved').length}
              warn
            />
          </div>

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
              <thead>
                <tr>
                  <th className="sticky-col" rowSpan={2}>
                    Mitarbeiter
                  </th>
                  {monthGroups.map((g, i) => (
                    <th key={i} colSpan={g.span} className="month-header">
                      {g.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  {weekNumbers.map((w) => (
                    <th key={w} title={weekDateRangeLabel(data.year, w)}>
                      {w}
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
                      {weekNumbers.map((w) => {
                        const status = weekStatus.get(w)
                        return (
                          <td
                            key={w}
                            className={status ? `plan-cell ${status}` : 'plan-cell'}
                            style={status ? { background: color, opacity: status === 'alternative' ? 0.55 : 1 } : undefined}
                            title={status ? `KW ${w}: ${STATUS_LABEL[status]}` : undefined}
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
                      KW {a.originalStartWeek}
                      {a.originalEndWeek !== a.originalStartWeek ? `–${a.originalEndWeek}` : ''}
                      <div className="hint">
                        {weekRangeDateLabel(data.year, a.originalStartWeek, a.originalEndWeek)}
                      </div>
                    </td>
                    <td>
                      {a.status === 'unresolved'
                        ? '–'
                        : (
                          <>
                            KW {a.startWeek}
                            {a.endWeek !== a.startWeek ? `–${a.endWeek}` : ''}
                            <div className="hint">{weekRangeDateLabel(data.year, a.startWeek, a.endWeek)}</div>
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

function SummaryCard({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`summary-card${warn && value > 0 ? ' warn' : ''}`}>
      <div className="summary-value">{value}</div>
      <div className="summary-label">{label}</div>
    </div>
  )
}
