import { usePlanning } from '../store/PlanningContext'
import { planningPeriodLabel, planningWeeks } from '../utils/isoWeek'

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

export default function ConstraintsPanel() {
  const { data, updateConstraints, setPlanningPeriod } = usePlanning()
  const { constraints } = data
  const weeks = planningWeeks(data.startYear, data.startMonth)

  const changePeriod = (startYear: number, startMonth: number) => {
    if (!Number.isInteger(startYear) || startYear < 2000 || startYear > 2100) return false
    if (startYear === data.startYear && startMonth === data.startMonth) return true
    if (
      data.requests.length > 0 &&
      !confirm(
        'Der Planungszeitraum wird geändert. Urlaubswünsche außerhalb des neuen Zeitraums werden entfernt. Fortfahren?',
      )
    ) {
      return false
    }
    setPlanningPeriod(startYear, startMonth)
    return true
  }

  return (
    <section className="panel">
      <h2>Einstellungen</h2>
      <div className="inline-form">
        <label>
          Startjahr
          <input
            key={data.startYear}
            type="number"
            min={2000}
            max={2100}
            defaultValue={data.startYear}
            onBlur={(e) => {
              if (!changePeriod(Number(e.target.value), data.startMonth)) {
                e.currentTarget.value = String(data.startYear)
              }
            }}
          />
        </label>
        <label>
          Startmonat
          <select
            value={data.startMonth}
            onChange={(e) => changePeriod(data.startYear, Number(e.target.value))}
          >
            {MONTH_NAMES.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
        </label>
        <span className="hint">
          {planningPeriodLabel(data.startYear, data.startMonth)} · {weeks.length} Kalenderwochen
        </span>
      </div>

      <div className="inline-form">
        <label>
          Max. Anzahl Mitarbeiter gleichzeitig im Urlaub
          <input
            type="number"
            min={1}
            value={constraints.maxConcurrentEmployees}
            onChange={(e) =>
              updateConstraints({
                ...constraints,
                maxConcurrentEmployees: Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          Max. durchgängige Urlaubsdauer (Wochen)
          <input
            type="number"
            min={1}
            value={constraints.maxConsecutiveWeeks}
            onChange={(e) =>
              updateConstraints({
                ...constraints,
                maxConsecutiveWeeks: Number(e.target.value),
              })
            }
          />
        </label>
      </div>
      <p className="hint">
        Das individuelle Urlaubswochen-Kontingent wird je Mitarbeiter in der Mitarbeiterverwaltung
        festgelegt.
      </p>
    </section>
  )
}
