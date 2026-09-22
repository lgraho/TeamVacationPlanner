import { useRef } from 'react'
import type { ChangeEvent } from 'react'
import { usePlanning } from '../store/PlanningContext'
import { exportPlanningDataToFile, parsePlanningDataFile } from '../store/persistence'

export default function ImportExportBar() {
  const { data, importData, resetData } = usePlanning()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = parsePlanningDataFile(text)
      importData(parsed)
    } catch (err) {
      alert(`Import fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      e.target.value = ''
    }
  }

  const handleReset = () => {
    if (confirm('Wirklich alle Daten zurücksetzen? Dies kann nicht rückgängig gemacht werden.')) {
      resetData()
    }
  }

  return (
    <div className="toolbar">
      <button onClick={() => exportPlanningDataToFile(data)}>Speichern</button>
      <button onClick={handleImportClick}>Importieren</button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button className="danger" onClick={handleReset}>
        Alle Daten zurücksetzen
      </button>
    </div>
  )
}
