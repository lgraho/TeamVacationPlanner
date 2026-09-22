import ExcelJS from 'exceljs'
import type { Employee, PlanningData, PlanningResult } from '../types'
import { planningPeriodLabel, planningWeekCodeRange, planningWeekLabel } from '../utils/isoWeek'
import { employeeColorHex } from '../utils/colors'
import { STATUS_LABEL } from '../utils/statusLabels'

const PRIORITY_LABEL: Record<string, string> = {
  fixed: 'Fixiert',
  high: 'Hoch',
  normal: 'Normal',
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Exportiert den berechneten Urlaubsplan als Excel-Arbeitsmappe (Wochenraster + Details + Hinweise). */
export async function exportPlanToExcel(data: PlanningData, result: PlanningResult): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Team-Urlaubsplaner'
  workbook.created = new Date()

  const employeeById = new Map<string, Employee>(data.employees.map((e) => [e.id, e]))

  addGridSheet(workbook, data, result)
  addDetailsSheet(workbook, result, employeeById)
  if (result.warnings.length > 0) {
    addWarningsSheet(workbook, result)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  triggerDownload(blob, `urlaubsplan-${data.startYear}-${String(data.startMonth).padStart(2, '0')}.xlsx`)
}

function addGridSheet(workbook: ExcelJS.Workbook, data: PlanningData, result: PlanningResult): void {
  const sheet = workbook.addWorksheet('Wochenraster')
  const weeks = result.weeks

  sheet.columns = [
    { header: 'Mitarbeiter', width: 22 },
    ...weeks.map((week) => ({ header: `KW ${week.isoWeek}/${week.isoYear}`, width: 10 })),
  ]
  sheet.getRow(1).font = { bold: true }
  sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }]

  for (const emp of data.employees) {
    const rowValues: (string | number)[] = [emp.name, ...weeks.map(() => '')]
    const row = sheet.addRow(rowValues)

    const own = result.assignments.filter((a) => a.employeeId === emp.id && a.status !== 'unresolved')
    const weekStatus = new Map<number, 'as-requested' | 'alternative'>()
    for (const a of own) {
      for (let w = a.startWeek; w <= a.endWeek; w++) {
        weekStatus.set(w, a.status as 'as-requested' | 'alternative')
      }
    }

    const colorHex = employeeColorHex(emp.id)
    weeks.forEach((week, idx) => {
      const status = weekStatus.get(week.index)
      if (!status) return
      const cell = row.getCell(idx + 2)
      cell.fill = {
        type: 'pattern',
        pattern: status === 'alternative' ? 'lightGray' : 'solid',
        fgColor: { argb: `FF${colorHex.toUpperCase()}` },
        ...(status === 'alternative' ? { bgColor: { argb: 'FFFFFFFF' } } : {}),
      }
    })
  }

  // Kalenderwochen-Datumsbereiche als Kommentar in der Kopfzeile ergänzen.
  weeks.forEach((week, idx) => {
    const cell = sheet.getRow(1).getCell(idx + 2)
    cell.note = planningWeekLabel(week)
  })
  sheet.name = `Wochenraster ${planningPeriodLabel(data.startYear, data.startMonth)}`.slice(0, 31)
}

function addDetailsSheet(
  workbook: ExcelJS.Workbook,
  result: PlanningResult,
  employeeById: Map<string, Employee>,
): void {
  const sheet = workbook.addWorksheet('Details')
  sheet.columns = [
    { header: 'Mitarbeiter', key: 'employee', width: 22 },
    { header: 'Priorität', key: 'priority', width: 12 },
    { header: 'Gewünscht (KW)', key: 'requested', width: 16 },
    { header: 'Zugeteilt (KW)', key: 'assigned', width: 16 },
    { header: 'Verschiebung (Wochen)', key: 'shift', width: 20 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Begründung', key: 'reason', width: 50 },
  ]
  sheet.getRow(1).font = { bold: true }

  const sorted = [...result.assignments].sort((a, b) => a.originalStartWeek - b.originalStartWeek)
  for (const a of sorted) {
    sheet.addRow({
      employee: employeeById.get(a.employeeId)?.name ?? '(gelöscht)',
      priority: PRIORITY_LABEL[a.priority] ?? a.priority,
      requested: planningWeekCodeRange(result.weeks, a.originalStartWeek, a.originalEndWeek),
      assigned:
        a.status === 'unresolved'
          ? '–'
          : planningWeekCodeRange(result.weeks, a.startWeek, a.endWeek),
      shift: a.status === 'alternative' ? a.shiftWeeks : '',
      status: STATUS_LABEL[a.status],
      reason: a.reason ?? '',
    })
  }
}

function addWarningsSheet(workbook: ExcelJS.Workbook, result: PlanningResult): void {
  const sheet = workbook.addWorksheet('Hinweise')
  sheet.columns = [{ header: 'Hinweis', key: 'message', width: 100 }]
  sheet.getRow(1).font = { bold: true }
  for (const w of result.warnings) {
    sheet.addRow({ message: w.message })
  }
}
