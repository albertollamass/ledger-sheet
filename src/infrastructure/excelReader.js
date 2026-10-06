// Infraestructura: lectura de .xlsx como matrices. Adaptador driven (WorkbookReader).
// Único punto que conoce la librería xlsx.

import { read, utils } from 'xlsx'

export function readWorkbookSheets(arrayBuffer) {
  const wb = read(arrayBuffer, { type: 'array' })
  return wb.SheetNames.map((name) => ({
    name,
    matrix: utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '' })
  }))
}
