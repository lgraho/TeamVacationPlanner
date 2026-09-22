import { useState } from 'react'
import type { FormEvent } from 'react'
import { usePlanning } from '../store/PlanningContext'
import type { Priority, VacationRequest } from '../types'
import { weeksInYear, weekDateRangeLabel } from '../utils/isoWeek'
import { employeeColor } from '../utils/colors'

const PRIORITY_LABEL: Record<Priority, string> = {
  fixed: 'Fixiert',
  high: 'Hoch',
  normal: 'Normal',
}

export default function RequestManager() {
  const { data, addRequest, updateRequest, deleteRequest } = usePlanning()
  const maxWeek = weeksInYear(data.year)
  const [employeeId, setEmployeeId] = useState('')
  const [startWeek, setStartWeek] = useState(1)
  const [endWeek, setEndWeek] = useState(1)
  const [priority, setPriority] = useState<Priority>('normal')

  const employeeById = new Map(data.employees.map((e) => [e.id, e]))

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
          Von KW
          <input
            type="number"
            min={1}
            max={maxWeek}
            value={startWeek}
            onChange={(e) => setStartWeek(Number(e.target.value))}
          />
        </label>
        <label>
          Bis KW
          <input
            type="number"
            min={1}
            max={maxWeek}
            value={endWeek}
            onChange={(e) => setEndWeek(Number(e.target.value))}
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
              maxWeek={maxWeek}
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
  maxWeek,
  onSave,
  onDelete,
}: {
  request: VacationRequest
  employeeName: string
  maxWeek: number
  onSave: (r: VacationRequest) => void
  onDelete: () => void
}) {
  const [startWeek, setStartWeek] = useState(request.startWeek)
  const [endWeek, setEndWeek] = useState(request.endWeek)
  const [priority, setPriority] = useState<Priority>(request.priority)

  const commit = (patch: Partial<VacationRequest>) => {
    onSave({ ...request, startWeek, endWeek, priority, ...patch })
  }

  return (
    <tr>
      <td>{employeeName}</td>
      <td>
        <input
          type="number"
          min={1}
          max={maxWeek}
          value={startWeek}
          onChange={(e) => setStartWeek(Number(e.target.value))}
          onBlur={() => commit({ startWeek })}
          style={{ width: '4em' }}
        />
        {' – '}
        <input
          type="number"
          min={1}
          max={maxWeek}
          value={endWeek}
          onChange={(e) => setEndWeek(Number(e.target.value))}
          onBlur={() => commit({ endWeek })}
          style={{ width: '4em' }}
        />
        <div className="hint">
          {weekDateRangeLabel(request.year, request.startWeek)} –{' '}
          {weekDateRangeLabel(request.year, request.endWeek)}
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
