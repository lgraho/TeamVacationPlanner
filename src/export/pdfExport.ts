import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Employee, PlanningData, PlanningResult } from '../types'
import { employeeColorHex } from '../utils/colors'
import { STATUS_LABEL } from '../utils/statusLabels'

const PRIORITY_LABEL: Record<string, string> = {
  fixed: 'Fixiert',
  high: 'Hoch',
  normal: 'Normal',
}

function hexToRgb(hex: string): [number, number, number] {
  const int = parseInt(hex, 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

/** Exportiert den berechneten Urlaubsplan als druckfertiges PDF (Übersicht + Wochenraster + Details). */
export function exportPlanToPdf(data: PlanningData, result: PlanningResult): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const employeeById = new Map<string, Employee>(data.employees.map((e) => [e.id, e]))

  doc.setFontSize(16)
  doc.text(`Urlaubsplan ${data.year}`, 40, 40)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Erstellt am ${new Date().toLocaleDateString('de-DE')}`, 40, 56)
  doc.setTextColor(0)

  const asRequested = result.assignments.filter((a) => a.status === 'as-requested').length
  const alternative = result.assignments.filter((a) => a.status === 'alternative').length
  const unresolved = result.assignments.filter((a) => a.status === 'unresolved').length
  doc.setFontSize(10)
  doc.text(
    `Wie gewünscht: ${asRequested}    Alternativ verschoben: ${alternative}    Nicht erfüllbar: ${unresolved}`,
    40,
    74,
  )

  let cursorY = 90

  if (result.warnings.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [['Hinweise']],
      body: result.warnings.map((w) => [w.message]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [245, 158, 11] },
      margin: { left: 40, right: 40 },
    })
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20
  }

  // Wochenraster
  const weekNumbers = Array.from({ length: result.weeksInYear }, (_, i) => i + 1)
  const gridBody = data.employees.map((emp) => {
    const own = result.assignments.filter((a) => a.employeeId === emp.id && a.status !== 'unresolved')
    const weekStatus = new Map<number, 'as-requested' | 'alternative'>()
    for (const a of own) {
      for (let w = a.startWeek; w <= a.endWeek; w++) {
        weekStatus.set(w, a.status as 'as-requested' | 'alternative')
      }
    }
    return [emp.name, ...weekNumbers.map((w) => weekStatus.get(w) ?? '')]
  })

  autoTable(doc, {
    startY: cursorY,
    head: [['Mitarbeiter', ...weekNumbers.map(String)]],
    body: gridBody,
    styles: { fontSize: 6, cellPadding: 1, halign: 'center', minCellHeight: 14 },
    columnStyles: { 0: { cellWidth: 90, halign: 'left', fontStyle: 'bold' } },
    headStyles: { fillColor: [55, 65, 81], fontSize: 6 },
    margin: { left: 40, right: 40 },
    didParseCell: (hookData) => {
      if (hookData.section !== 'body' || hookData.column.index === 0) return
      const status = hookData.cell.raw as 'as-requested' | 'alternative' | ''
      if (!status) return
      const empName = hookData.row.cells[0]?.raw as string
      const emp = data.employees.find((e) => e.name === empName)
      if (!emp) return
      const [r, g, b] = hexToRgb(employeeColorHex(emp.id))
      hookData.cell.styles.fillColor =
        status === 'alternative'
          ? [r + (255 - r) * 0.5, g + (255 - g) * 0.5, b + (255 - b) * 0.5]
          : [r, g, b]
      hookData.cell.text = []
    },
  })
  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20

  // Detailtabelle je Urlaubswunsch
  const sorted = [...result.assignments].sort((a, b) => a.originalStartWeek - b.originalStartWeek)
  autoTable(doc, {
    startY: cursorY,
    head: [['Mitarbeiter', 'Priorität', 'Gewünscht (KW)', 'Zugeteilt (KW)', 'Verschiebung', 'Status']],
    body: sorted.map((a) => [
      employeeById.get(a.employeeId)?.name ?? '(gelöscht)',
      PRIORITY_LABEL[a.priority] ?? a.priority,
      a.originalStartWeek === a.originalEndWeek
        ? `${a.originalStartWeek}`
        : `${a.originalStartWeek}–${a.originalEndWeek}`,
      a.status === 'unresolved'
        ? '–'
        : a.startWeek === a.endWeek
          ? `${a.startWeek}`
          : `${a.startWeek}–${a.endWeek}`,
      a.status === 'alternative' ? `${a.shiftWeeks > 0 ? '+' : ''}${a.shiftWeeks} Wo.` : '',
      STATUS_LABEL[a.status],
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: 40, right: 40 },
  })

  doc.save(`urlaubsplan-${data.year}.pdf`)
}
