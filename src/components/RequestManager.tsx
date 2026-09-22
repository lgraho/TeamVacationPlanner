import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { usePlanning } from '../store/PlanningContext'
import type { PlanningWeek, Priority, VacationRequest } from '../types'
import { planningPeriodLabel, planningWeekLabel, planningWeeks } from '../utils/isoWeek'

const PRIORITY_LABEL: Record<Priority, string> = {
  fixed: 'Fixiert',
  high: 'Hoch',
  normal: 'Normal',
}

function WeekSelect({
  weeks,
  value,
  onChange,
  ariaLabel,
}: {
  weeks: PlanningWeek[]
  value: number
  onChange: (week: number) => void
  ariaLabel: string
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={Math.min(value, weeks.length)}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {weeks.map((week) => (
        <option key={week.index} value={week.index}>
          {planningWeekLabel(week)}
        </option>
      ))}
    </select>
  )
}

export default function RequestManager() {
  const { data, addRequest, updateRequest, deleteRequest } = usePlanning()
  const [employeeId, setEmployeeId] = useState('')
  const [startWeek, setStartWeek] = useState(1)
  const [endWeek, setEndWeek] = useState(1)
  const [priority, setPriority] = useState<Priority>('normal')
  const weeks = useMemo(
    () => planningWeeks(data.startYear, data.startMonth),
    [data.startYear, data.startMonth],
  )

  const employeeById = new Map(data.employees.map((e) => [e.id, e]))

  const handleStartWeekChange = (week: number) => {
    setStartWeek(week)
    setEndWeek((prev) => Math.max(prev, week))
  }

  const handleEndWeekChange = (week: number) => {
    setEndWeek(Math.max(week, startWeek))
  }

  const handleAdd = (e: FormEvent) => {
    e.preventDefault()
    if (!employeeId) return
    addRequest({
      employeeId,
      startWeek: Math.min(startWeek, weeks.length),
      endWeek: Math.min(Math.max(startWeek, endWeek), weeks.length),
      priority,
    })
    setStartWeek(1)
    setEndWeek(1)
    setPriority('normal')
  }

  const sortedRequests = [...data.requests].sort((a, b) => a.startWeek - b.startWeek)

  return (
    <section className="panel">
      <h2>Urlaubswünsche: {planningPeriodLabel(data.startYear, data.startMonth)}</h2>
      <form className="inline-form" onSubmit={handleAdd}>
        <label>
          Mitarbeiter
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
            <option value="" disabled>
              Bitte wählen
            </option>
            {data.employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Von Kalenderwoche
          <WeekSelect
            weeks={weeks}
            value={startWeek}
            onChange={handleStartWeekChange}
            ariaLabel="Von Kalenderwoche"
          />
        </label>
        <label>
          Bis Kalenderwoche
          <WeekSelect
            weeks={weeks}
            value={endWeek}
            onChange={handleEndWeekChange}
            ariaLabel="Bis Kalenderwoche"
          />
        </label>
        <label>
          Priorität
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            <option value="normal">Normal</option>
            <option value="high">Hoch</option>
            <option value="fixed">Fixiert</option>
          </select>
        </label>
        <button type="submit" disabled={data.employees.length === 0}>
          Hinzufügen
        </button>
      </form>
      {data.employees.length === 0 && (
        <p className="empty-hint">Bitte zuerst Mitarbeiter anlegen.</p>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Mitarbeiter</th>
            <th>Zeitraum</th>
            <th>Priorität</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sortedRequests.map((req) => (
            <RequestRow
              key={req.id}
              request={req}
              employeeName={employeeById.get(req.employeeId)?.name ?? '(gelöscht)'}
              weeks={weeks}
              onSave={updateRequest}
              onDelete={() => deleteRequest(req.id)}
            />
          ))}
          {sortedRequests.length === 0 && (
            <tr>
              <td colSpan={4} className="empty-hint">
                Noch keine Urlaubswünsche erfasst.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}

function RequestRow({
  request,
  employeeName,
  weeks,
  onSave,
  onDelete,
}: {
  request: VacationRequest
  employeeName: string
  weeks: PlanningWeek[]
  onSave: (r: VacationRequest) => void
  onDelete: () => void
}) {
  const [startWeek, setStartWeek] = useState(request.startWeek)
  const [endWeek, setEndWeek] = useState(request.endWeek)
  const [priority, setPriority] = useState<Priority>(request.priority)

  const commit = (patch: Partial<VacationRequest>) => {
    onSave({ ...request, startWeek, endWeek, priority, ...patch })
  }

  const handleStartWeekChange = (week: number) => {
    const nextEnd = Math.max(endWeek, week)
    setStartWeek(week)
    setEndWeek(nextEnd)
    commit({ startWeek: week, endWeek: nextEnd })
  }

  const handleEndWeekChange = (week: number) => {
    const nextEnd = Math.max(week, startWeek)
    setEndWeek(nextEnd)
    commit({ endWeek: nextEnd })
  }

  return (
    <tr>
      <td>{employeeName}</td>
      <td>
        <div className="week-range-select">
          <WeekSelect
            weeks={weeks}
            value={startWeek}
            onChange={handleStartWeekChange}
            ariaLabel="Von Kalenderwoche"
          />
          <span> – </span>
          <WeekSelect
            weeks={weeks}
            value={endWeek}
            onChange={handleEndWeekChange}
            ariaLabel="Bis Kalenderwoche"
          />
        </div>
      </td>
      <td>
        <select
          value={priority}
          onChange={(e) => {
            const p = e.target.value as Priority
            setPriority(p)
            commit({ priority: p })
          }}
        >
          <option value="normal">{PRIORITY_LABEL.normal}</option>
          <option value="high">{PRIORITY_LABEL.high}</option>
          <option value="fixed">{PRIORITY_LABEL.fixed}</option>
        </select>
      </td>
      <td>
        <button className="danger" onClick={onDelete}>
          Entfernen
        </button>
      </td>
    </tr>
  )
}
