import { useState } from 'react'
import type { FormEvent } from 'react'
import { usePlanning } from '../store/PlanningContext'
import type { Employee } from '../types'

export default function EmployeeManager() {
  const { data, addEmployee, updateEmployee, deleteEmployee } = usePlanning()
  const [name, setName] = useState('')
  const [maxWeeks, setMaxWeeks] = useState(6)

  const handleAdd = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    addEmployee({ name: name.trim(), maxVacationWeeks: maxWeeks })
    setName('')
    setMaxWeeks(6)
  }

  return (
    <section className="panel">
      <h2>Mitarbeiter</h2>
      <form className="inline-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <label>
          Max. Urlaubswochen/Planungszeitraum
          <input
            type="number"
            min={0}
            max={53}
            value={maxWeeks}
            onChange={(e) => setMaxWeeks(Number(e.target.value))}
          />
        </label>
        <button type="submit">Hinzufügen</button>
      </form>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Max. Urlaubswochen/Planungszeitraum</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.employees.map((emp) => (
            <EmployeeRow
              key={emp.id}
              employee={emp}
              onSave={updateEmployee}
              onDelete={() => deleteEmployee(emp.id)}
            />
          ))}
          {data.employees.length === 0 && (
            <tr>
              <td colSpan={3} className="empty-hint">
                Noch keine Mitarbeiter angelegt.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}

function EmployeeRow({
  employee,
  onSave,
  onDelete,
}: {
  employee: Employee
  onSave: (e: Employee) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(employee.name)
  const [maxWeeks, setMaxWeeks] = useState(employee.maxVacationWeeks)

  const commit = () => {
    if (name.trim() && (name !== employee.name || maxWeeks !== employee.maxVacationWeeks)) {
      onSave({ ...employee, name: name.trim(), maxVacationWeeks: maxWeeks })
    }
  }

  return (
    <tr>
      <td>
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={commit} />
      </td>
      <td>
        <input
          type="number"
          min={0}
          max={53}
          value={maxWeeks}
          onChange={(e) => setMaxWeeks(Number(e.target.value))}
          onBlur={commit}
        />
      </td>
      <td>
        <button className="danger" onClick={onDelete}>
          Entfernen
        </button>
      </td>
    </tr>
  )
}
