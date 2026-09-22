import { useState } from 'react'
import type { FormEvent } from 'react'
import { usePlanning } from '../store/PlanningContext'
import type { Priority, VacationRequest } from '../types'
import {
  weekStartDate,
  weekEndDate,
  dateToWeekInYear,
  formatDateInput,
  parseDateInput,
} from '../utils/isoWeek'
import { employeeColor } from '../utils/colors'

const PRIORITY_LABEL: Record<Priority, string> = {
  fixed: 'Fixiert',
  high: 'Hoch',
  normal: 'Normal',
}

/** Kurzes Datumsformat `TT.MM.` für Hinweistexte. */
function formatDateShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`
}

export default function RequestManager() {
  const { data, addRequest, updateRequest, deleteRequest } = usePlanning()
  const [employeeId, setEmployeeId] = useState('')
  const [startWeek, setStartWeek] = useState(1)
  const [endWeek, setEndWeek] = useState(1)
  const [priority, setPriority] = useState<Priority>('normal')

  const employeeById = new Map(data.employees.map((e) => [e.id, e]))

  const minDate = formatDateInput(new Date(data.year, 0, 1))
  const maxDate = formatDateInput(new Date(data.year, 11, 31))

  const handleStartDateChange = (value: string) => {
    if (!value) return
    const week = dateToWeekInYear(parseDateInput(value), data.year)
    setStartWeek(week)
    setEndWeek((prev) => Math.max(prev, week))
  }

  const handleEndDateChange = (value: string) => {
    if (!value) return
    const week = dateToWeekInYear(parseDateInput(value), data.year)
    setEndWeek(Math.max(week, startWeek))
  }

  const handleAdd = (e: FormEvent) => {
    e.preventDefault()
    if (!employeeId) return
    addRequest({
      employeeId,
      year: data.year,
      startWeek,
      endWeek: Math.max(startWeek, endWeek),
      priority,
    })
    setStartWeek(1)
    setEndWeek(1)
    setPriority('normal')
  }

  const sortedRequests = [...data.requests].sort((a, b) => a.startWeek - b.startWeek)

  return (
    <section className="panel">
      <h2>Urlaubswünsche {data.year}</h2>
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
          Von
          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={formatDateInput(weekStartDate(data.year, startWeek))}
            onChange={(e) => handleStartDateChange(e.target.value)}
          />
        </label>
        <label>
          Bis
          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={formatDateInput(weekEndDate(data.year, endWeek))}
            onChange={(e) => handleEndDateChange(e.target.value)}
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
        <span className="hint">
          KW {startWeek}
          {endWeek !== startWeek ? `–${endWeek}` : ''}
        </span>
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
              year={data.year}
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

      <div className="legend">
        {data.employees.map((emp) => (
          <span key={emp.id} className="legend-item">
            <span className="legend-swatch" style={{ background: employeeColor(emp.id) }} />
            {emp.name}
          </span>
        ))}
      </div>
    </section>
  )
}

function RequestRow({
  request,
  employeeName,
  year,
  onSave,
  onDelete,
}: {
  request: VacationRequest
  employeeName: string
  year: number
  onSave: (r: VacationRequest) => void
  onDelete: () => void
}) {
  const [startWeek, setStartWeek] = useState(request.startWeek)
  const [endWeek, setEndWeek] = useState(request.endWeek)
  const [priority, setPriority] = useState<Priority>(request.priority)

  const minDate = formatDateInput(new Date(year, 0, 1))
  const maxDate = formatDateInput(new Date(year, 11, 31))

  const commit = (patch: Partial<VacationRequest>) => {
    onSave({ ...request, startWeek, endWeek, priority, ...patch })
  }

  const handleStartDateChange = (value: string) => {
    if (!value) return
    const week = dateToWeekInYear(parseDateInput(value), year)
    const nextEnd = Math.max(endWeek, week)
    setStartWeek(week)
    setEndWeek(nextEnd)
    commit({ startWeek: week, endWeek: nextEnd })
  }

  const handleEndDateChange = (value: string) => {
    if (!value) return
    const week = Math.max(dateToWeekInYear(parseDateInput(value), year), startWeek)
    setEndWeek(week)
    commit({ endWeek: week })
  }

  return (
    <tr>
      <td>{employeeName}</td>
      <td>
        <input
          type="date"
          min={minDate}
          max={maxDate}
          value={formatDateInput(weekStartDate(year, startWeek))}
          onChange={(e) => handleStartDateChange(e.target.value)}
        />
        {' – '}
        <input
          type="date"
          min={minDate}
          max={maxDate}
          value={formatDateInput(weekEndDate(year, endWeek))}
          onChange={(e) => handleEndDateChange(e.target.value)}
        />
        <div className="hint">
          KW {startWeek}
          {endWeek !== startWeek ? `–${endWeek}` : ''} ({formatDateShort(weekStartDate(year, startWeek))}–
          {formatDateShort(weekEndDate(year, endWeek))})
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
