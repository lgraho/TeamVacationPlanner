import ExcelJS from 'exceljs'
import type { Employee, PlanningData, PlanningResult } from '../types'
import { weekDateRangeLabel } from '../utils/isoWeek'
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
  workbook.creator = 'Urlaubsplaner'
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
  triggerDownload(blob, `urlaubsplan-${data.year}.xlsx`)
}

function addGridSheet(workbook: ExcelJS.Workbook, data: PlanningData, result: PlanningResult): void {
  const sheet = workbook.addWorksheet('Wochenraster')
  const weekNumbers = Array.from({ length: result.weeksInYear }, (_, i) => i + 1)

  sheet.columns = [
    { header: 'Mitarbeiter', width: 22 },
    ...weekNumbers.map((w) => ({ header: `KW ${w}`, width: 6 })),
  ]
  sheet.getRow(1).font = { bold: true }
  sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }]

  for (const emp of data.employees) {
    const rowValues: (string | number)[] = [emp.name, ...weekNumbers.map(() => '')]
    const row = sheet.addRow(rowValues)

    const own = result.assignments.filter((a) => a.employeeId === emp.id && a.status !== 'unresolved')
    const weekStatus = new Map<number, 'as-requested' | 'alternative'>()
    for (const a of own) {
      for (let w = a.startWeek; w <= a.endWeek; w++) {
        weekStatus.set(w, a.status as 'as-requested' | 'alternative')
      }
    }

    const colorHex = employeeColorHex(emp.id)
    weekNumbers.forEach((w, idx) => {
      const status = weekStatus.get(w)
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
  weekNumbers.forEach((w, idx) => {
    const cell = sheet.getRow(1).getCell(idx + 2)
    cell.note = weekDateRangeLabel(data.year, w)
  })
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
      requested:
        a.originalStartWeek === a.originalEndWeek
          ? `${a.originalStartWeek}`
          : `${a.originalStartWeek}–${a.originalEndWeek}`,
      assigned:
        a.status === 'unresolved'
          ? '–'
          : a.startWeek === a.endWeek
            ? `${a.startWeek}`
            : `${a.startWeek}–${a.endWeek}`,
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
