import { usePlanning } from '../store/PlanningContext'
import { weeksInYear } from '../utils/isoWeek'

export default function ConstraintsPanel() {
  const { data, updateConstraints, setYear } = usePlanning()
  const { constraints } = data

  return (
    <section className="panel">
      <h2>Einstellungen</h2>
      <div className="inline-form">
        <label>
          Planungsjahr
          <input
            type="number"
            value={data.year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </label>
        <span className="hint">{weeksInYear(data.year)} Kalenderwochen</span>
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
