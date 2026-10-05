import { read, utils } from 'xlsx'

// Nombres de sección que la plantilla reconoce como cabecera de grupo.
// (Solo se usan para detectar grupos al importar; el formulario usa src/categories.js)
const KNOWN_GROUP_NAMES = [
  'Ingresos',
  'Gastos Fijos',
  'Hogar',
  'Comida',
  'Transporte',
  'Salud',
  'Vida Diaria',
  'Niños',
  'Obligaciones',
  'Entretenimiento',
  'Ahorro',
  'Gastos'
]

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const norm = (v) => String(v ?? '').trim()

export function parseAmountCell(v) {
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0
  if (v instanceof Date) return 0
  if (typeof v === 'boolean') return 0
  let s = String(v).replace(/\u00a0/g, ' ').replace(/\$/g, '').trim()
  if (s === '' || s === '-' || s.toUpperCase() === '#N/A') return 0
  let neg = false
  if (s.startsWith('-')) {
    neg = true
    s = s.slice(1).trim()
  }
  // Formato europeo "1.722,46" o simple "1722,46" / "1722.46".
  // "18.425" (puntos cada 3 dígitos, sin coma) = miles -> 18425
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '')
  }
  s = s.replace(/[^\d.]/g, '')
  const n = Number(s)
  if (!Number.isFinite(n)) return 0
  const r = Math.round(n * 100) / 100
  return neg ? -r : r
}

function detectYear(sheetName, matrix) {
  const m = String(sheetName).match(/(19|20)\d{2}/)
  if (m) return Number(m[0])
  // Buscar un año en las primeras filas (título de la hoja)
  for (let i = 0; i < Math.min(6, matrix.length); i++) {
    for (const cell of matrix[i] || []) {
      const mm = String(cell ?? '').match(/(19|20)\d{2}/)
      if (mm) return Number(mm[0])
    }
  }
  return null
}

function parseSheet(matrix) {
  // Fila de cabecera: la que contiene "Enero"
  let hdrIdx = -1
  for (let i = 0; i < matrix.length; i++) {
    const row = (matrix[i] || []).map(norm)
    if (row.includes('Enero')) {
      hdrIdx = i
      break
    }
  }
  if (hdrIdx === -1) return { error: 'No se encontró la fila de meses (Enero…Diciembre)' }

  const hdr = (matrix[hdrIdx] || []).map(norm)
  const monthCols = []
  for (const mName of MONTH_NAMES) {
    const j = hdr.indexOf(mName)
    if (j !== -1) monthCols.push(j)
  }
  if (monthCols.length < 6) return { error: 'Cabecera de meses incompleta' }
  const labelCol = monthCols[0] - 1
  if (labelCol < 0) return { error: 'No se encontró la columna de conceptos' }

  // Saldo inicial
  let balance = 0
  for (const row of matrix) {
    const idx = (row || []).findIndex((c) => norm(c).toLowerCase().includes('saldo'))
    if (idx !== -1) {
      for (let j = idx + 1; j < (row || []).length; j++) {
        const c = norm(row[j])
        if (c === '' || c === '[42]') continue
        balance = parseAmountCell(row[j])
        break
      }
      break
    }
  }

  const movements = []
  let currentGroup = null
  for (let i = hdrIdx + 1; i < matrix.length; i++) {
    const row = matrix[i] || []
    const label = norm(row[labelCol])
    if (label !== '' && KNOWN_GROUP_NAMES.includes(label)) {
      currentGroup = label
      continue
    }
    if (label === '') continue
    if (
      label.startsWith('Total ') ||
      label.startsWith('%') ||
      label.startsWith('Neto (') ||
      label === 'Acumulado' ||
      label.includes('Planilla') ||
      label.toLowerCase().includes('saldo')
    ) {
      continue
    }
    if (!currentGroup) continue
    const kind = currentGroup === 'Ingresos' ? 'ingreso' : 'gasto'
    monthCols.forEach((colIdx, m) => {
      const amount = parseAmountCell(row[colIdx])
      if (amount !== 0) {
        movements.push({
          kind,
          group: currentGroup,
          label,
          amount,
          month: m + 1
        })
      }
    })
  }
  return { balance, movements }
}

/**
 * Parsea un .xlsx/.xls con hojas por año (como tu plantilla).
 * Devuelve { balances, movements, sheets, warnings }.
 * Cada celda con valor se convierte en un movimiento el día 15 de su mes.
 */
export function parseExcelFile(arrayBuffer) {
  const wb = read(arrayBuffer, { type: 'array' })
  const balances = {}
  const movements = []
  const sheets = []
  const warnings = []

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name]
    const matrix = utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' })
    if (!matrix.length) continue
    const year = detectYear(name, matrix)
    if (!year) {
      warnings.push(`Hoja "${name}": no se detectó el año, se omite (renómbrala como 2024, 2025…)`)
      continue
    }
    const parsed = parseSheet(matrix)
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
    sheets.push({ name, year, count: n, income: inc, expense: exp, balance: parsed.balance })
  }

  return { balances, movements, sheets, warnings }
}

export const keyOf = (m) => `${m.year}|${m.month}|${m.label}|${m.amount}`
