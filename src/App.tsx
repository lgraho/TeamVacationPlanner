import { useState } from 'react'
import { PlanningProvider } from './store/PlanningContext'
import EmployeeManager from './components/EmployeeManager'
import RequestManager from './components/RequestManager'
import ConstraintsPanel from './components/ConstraintsPanel'
import PlanBoard from './components/PlanBoard'
import ImportExportBar from './components/ImportExportBar'
import './App.css'

type Tab = 'employees' | 'requests' | 'settings' | 'plan'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'employees', label: 'Mitarbeiter' },
  { id: 'requests', label: 'Urlaubswünsche' },
  { id: 'settings', label: 'Einstellungen' },
  { id: 'plan', label: 'Planung' },
]

function AppShell() {
  const [tab, setTab] = useState<Tab>('employees')

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏥 Team-Urlaubsplaner</h1>
        <ImportExportBar />
      </header>
      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main>
        {tab === 'employees' && <EmployeeManager />}
        {tab === 'requests' && <RequestManager />}
        {tab === 'settings' && <ConstraintsPanel />}
        {tab === 'plan' && <PlanBoard />}
      </main>
      <footer className="app-footer">
        Alle Daten verbleiben lokal in deinem Browser (localStorage). Nutze Export, um ein Backup zu
        sichern.
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <PlanningProvider>
      <AppShell />
    </PlanningProvider>
  )
}
