// Verifica invariantes del dominio y el contrato del puerto LedgerStore
// con un store falso en memoria. Sin Firebase ni navegador.
import { strict as assert } from 'node:assert'
import { eur, parseAmount, parseSharedAmount } from '../src/domain/money.js'
import { buildYearMatrix, sum } from '../src/domain/ledger.js'
import { keyOf, movementFromForm } from '../src/domain/movement.js'
import { detectYear, parseAmountCell, parseLedgerSheet } from '../src/domain/workbook.js'
import { groupOfLabel } from '../src/domain/categories.js'
import { saveBalance } from '../src/application/balances.js'
import { removeMovement, saveMovement } from '../src/application/movements.js'
import { importPreview, previewWorkbook } from '../src/application/workbookImport.js'

// --- money ---
assert.match(eur(1234.56), /1234/)
assert.match(eur(1234.56), /€/)
assert.equal(parseAmount('$ 2.099,53'), 2099.53)
assert.equal(parseSharedAmount('Pago 12,50 € en tienda'), 12.5)
assert.equal(parseSharedAmount('Compra 1.234,56 EUR 2026-03-04'), 1234.56)
assert.equal(parseSharedAmount('Gastado 8.99 en taxi'), 8.99)
assert.equal(parseSharedAmount('Movimiento 2025-01-15 sin importe'), 0)

// --- movement ---
assert.deepEqual(movementFromForm({ kind: 'gasto', group: 'Comida', label: 'Delivery', amount: '37,70', date: '2026-03-10', note: '' }), {
  kind: 'gasto', group: 'Comida', label: 'Delivery', amount: 37.7,
  date: '2026-03-10', year: 2026, month: 3, note: ''
})
assert.equal(keyOf({ year: 2026, month: 3, label: 'Delivery', amount: 37.7 }), '2026|3|Delivery|37.7')
assert.equal(groupOfLabel('Delivery'), 'Comida')
assert.equal(groupOfLabel('Inexistente'), 'Otros')

// --- ledger ---
const movs = [
  { kind: 'ingreso', group: 'Ingresos', label: 'Salario Neto', amount: 2000, year: 2026, month: 1 },
  { kind: 'gasto', group: 'Comida', label: 'Delivery', amount: 30, year: 2026, month: 1 },
  { kind: 'gasto', group: 'Comida', label: 'Delivery', amount: 10, year: 2026, month: 2 },
  { kind: 'gasto', group: 'Comida', label: 'Delivery', amount: 99, year: 2025, month: 1 }
]
const m = buildYearMatrix(movs, 2026)
assert.equal(sum(m.incomeByMonth), 2000)
assert.equal(sum(m.expenseByMonth), 40)
assert.equal(m.byGroup.Comida.Delivery[0], 30)
assert.equal(m.byGroup.Comida.Delivery[1], 10)

// --- workbook (matriz con el formato de la plantilla) ---
const sheet = [
  ['Planilla de Ingresos y Gastos Mensuales'],
  ['Saldo  Inicial', 18425],
  ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  ['Ingresos'],
  ['Salario Neto', 2099.53, '', '', '', '', '', '', '', '', '', '', ''],
  ['Bizum', '182,00 €', '', '', '', '', '', '', '', '', '', '', ''],
  ['Total Ingresos', 2281.53, '', '', '', '', '', '', '', '', '', '', ''],
  ['Hogar'],
  ['Alquiler', 572, 572, '', '', '', '', '', '', '', '', '', ''],
  ['Total Hogar', 1144, '', '', '', '', '', '', '', '', '', '', '']
]
assert.equal(detectYear('2026', sheet), 2026)
assert.equal(parseAmountCell('18.425'), 18425)
const parsed = parseLedgerSheet(sheet)
assert.equal(parsed.balance, 18425)
assert.equal(parsed.movements.length, 4)
assert.equal(parsed.movements.filter((x) => x.kind === 'ingreso').reduce((a, x) => a + x.amount, 0), 2099.53 + 182)
assert.equal(parsed.movements.filter((x) => x.kind === 'gasto').reduce((a, x) => a + x.amount, 0), 1144)
assert.ok(!parsed.movements.some((x) => x.label.startsWith('Total ')))

// --- application contra store falso (valida el contrato del puerto) ---
function fakeStore(seed = { movements: [], balances: {} }) {
  let movements = [...seed.movements]
  let balances = { ...seed.balances }
  const listeners = new Set()
  return {
    calls: [],
    subscribeMovements(cb) { listeners.add(cb); cb([...movements]); return () => listeners.delete(cb) },
    async listMovements() { return [...movements] },
    async addMovement(data) {
      const r = { id: `t-${movements.length}`, ...data }
      movements = [r, ...movements]
      listeners.forEach((cb) => cb([...movements]))
      return r
    },
    async addMovementsBatch(items) {
      const fresh = items.map((d, i) => ({ id: `b-${i}`, ...d }))
      movements = [...fresh, ...movements]
      listeners.forEach((cb) => cb([...movements]))
      return fresh.length
    },
    async removeMovement(id) { movements = movements.filter((x) => x.id !== id) },
    async loadBalances() { return { ...balances } },
    async saveBalance(year, value) { balances = { ...balances, [String(year)]: Number(value) || 0 } }
  }
}

const store = fakeStore()
let seen = null
const unsub = store.subscribeMovements((ms) => { seen = ms })
const saved = await saveMovement(store, { kind: 'gasto', group: 'Comida', label: 'Delivery', amount: '37,70', date: '2026-03-10', note: '' })
assert.equal(saved.amount, 37.7)
assert.equal(saved.year, 2026)
assert.equal(seen.length, 1)
await removeMovement(store, saved.id)
assert.equal((await store.listMovements()).length, 0)
await saveBalance(store, 2026, '40429')
assert.deepEqual(await store.loadBalances(), { 2026: 40429 })
unsub()

// previewWorkbook con lector falso + importPreview sin duplicar
const fakeReader = () => [{ name: '2026', matrix: sheet }]
const preview = previewWorkbook(fakeReader, new ArrayBuffer(0))
assert.equal(preview.sheets[0].year, 2026)
assert.equal(preview.movements.length, 4)
assert.deepEqual(preview.balances, { 2026: 18425 })
const store2 = fakeStore()
assert.deepEqual(await importPreview(store2, preview), { imported: 4 })
assert.deepEqual(await importPreview(store2, preview), { imported: 0 })
assert.equal((await store2.listMovements()).length, 4)
assert.deepEqual(await store2.loadBalances(), { 2026: 18425 })

console.log('verify OK: dominio, casos de uso y contrato del puerto')
