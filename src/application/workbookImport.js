// Aplicación: importar la plantilla Excel. Orquesta dominio (workbook, movement)
// con los puertos LedgerStore y WorkbookReader. Sin xlsx ni Firebase aquí.

import { detectYear, parseLedgerSheet } from '../domain/workbook.js'
import { keyOf } from '../domain/movement.js'

/**
 * Lee un .xlsx y devuelve vista previa por hoja/año sin guardar nada:
 * { balances, movements, sheets: [{ name, year, count, income, expense, balance }], warnings }
 */
export function previewWorkbook(workbookReader, arrayBuffer) {
  const sheets = workbookReader(arrayBuffer)
  const balances = {}
  const movements = []
  const preview = []
  const warnings = []

  for (const { name, matrix } of sheets) {
    if (!matrix.length) continue
    const year = detectYear(name, matrix)
    if (!year) {
      warnings.push(`Hoja "${name}": no se detectó el año, se omite (renómbrala como 2024, 2025…)`)
      continue
    }
    const parsed = parseLedgerSheet(matrix)
    if (parsed.error) {
      warnings.push(`Hoja "${name}": ${parsed.error}`)
      continue
    }
    balances[String(year)] = parsed.balance
    let n = 0
    for (const m of parsed.movements) {
      movements.push({
        ...m,
        year,
        date: `${year}-${String(m.month).padStart(2, '0')}-15`,
        note: 'Importado del Excel',
        imported: true
      })
      n++
    }
    const inc = parsed.movements.filter((m) => m.kind === 'ingreso').reduce((a, m) => a + m.amount, 0)
    const exp = parsed.movements.filter((m) => m.kind === 'gasto').reduce((a, m) => a + m.amount, 0)
    preview.push({ name, year, count: n, income: inc, expense: exp, balance: parsed.balance })
  }

  return { balances, movements, sheets: preview, warnings }
}

/**
 * Vuelca una vista previa al store sin duplicar (clave año|mes|tipo|importe).
 * Devuelve { imported: number }.
 */
export async function importPreview(store, preview) {
  const existing = new Set((await store.listMovements()).map(keyOf))
  const fresh = preview.movements.filter((m) => !existing.has(keyOf(m)))
  await store.addMovementsBatch(fresh)
  for (const [y, v] of Object.entries(preview.balances)) {
    await store.saveBalance(y, v)
  }
  return { imported: fresh.length }
}
