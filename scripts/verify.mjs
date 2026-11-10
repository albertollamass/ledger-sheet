// Verifica invariantes del dominio y el contrato del puerto LedgerStore
// con un store falso en memoria. Sin Firebase ni navegador.
import { strict as assert } from 'node:assert'
import { eur, parseAmount, parseSharedAmount } from '../src/domain/money.js'
import { buildYearMatrix, sum } from '../src/domain/ledger.js'
import { keyOf, movementFromForm } from '../src/domain/movement.js'
import { detectYear, parseAmountCell, parseLedgerSheet } from '../src/domain/workbook.js'
import { groupOfLabel } from '../src/domain/categories.js'
import { dueOccurrences, movementFromRule, nextOccurrence, occurrenceDate, ruleFromForm } from '../src/domain/recurring.js'
import { displayGroup, displayLabel, normalizePreferences, personalizeGroups } from '../src/domain/catalog.js'
import { APP_VERSION, currentRelease } from '../src/domain/releases.js'
import { saveBalance } from '../src/application/balances.js'
import { removeMovement, saveMovement } from '../src/application/movements.js'
import { runRecurring } from '../src/application/recurring.js'
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

// --- recurring (reglas mensuales) ---
assert.equal(occurrenceDate(2026, 2, 31), '2026-02-28')
assert.equal(occurrenceDate(2024, 2, 31), '2024-02-29')
const rule = ruleFromForm({
  kind: 'gasto', group: 'Comida', label: 'Comida-Leroy',
  amount: '120,50', day: '31', startDate: '2026-01-01', note: ''
})
assert.equal(rule.amount, 120.5)
assert.equal(rule.day, 31)
assert.deepEqual(dueOccurrences(rule, '2026-03-31'), ['2026-01-31', '2026-02-28', '2026-03-31'])
assert.deepEqual(dueOccurrences({ ...rule, lastRun: '2026-02-28' }, '2026-03-31'), ['2026-03-31'])
assert.deepEqual(dueOccurrences(rule, '2026-03-30'), ['2026-01-31', '2026-02-28'])
assert.deepEqual(dueOccurrences({ ...rule, active: false }, '2026-03-31'), [])
assert.equal(nextOccurrence({ ...rule, lastRun: '2026-03-31' }, '2026-03-31'), '2026-04-30')
assert.equal(nextOccurrence(rule, '2026-03-31'), '2026-03-31')
assert.equal(nextOccurrence({ ...rule, active: false }, '2026-03-31'), null)
assert.deepEqual(movementFromRule({ ...rule, id: 'r1' }, '2026-03-31'), {
  kind: 'gasto', group: 'Comida', label: 'Comida-Leroy', amount: 120.5,
  date: '2026-03-31', year: 2026, month: 3, note: '', recurringId: 'r1'
})

// --- catálogo personalizado ---
const prefs = normalizePreferences({
  labels: { 'Comida-Leroy': '  Comida Leroy ', Igual: 'Igual', Vacio: '   ' },
  groups: { Comida: 'Alimentación' }
})
assert.deepEqual(prefs.labels, { 'Comida-Leroy': 'Comida Leroy' })
assert.deepEqual(prefs.groups, { Comida: 'Alimentación' })
assert.equal(displayLabel(prefs, 'Comida-Leroy'), 'Comida Leroy')
assert.equal(displayLabel(prefs, 'Delivery'), 'Delivery')
assert.equal(displayGroup(prefs, 'Comida'), 'Alimentación')
const personalized = personalizeGroups([{ group: 'Comida', items: ['Delivery', 'Comida-Leroy'] }], prefs)
assert.equal(personalized[0].groupLabel, 'Alimentación')
assert.deepEqual(personalized[0].items[1], { value: 'Comida-Leroy', label: 'Comida Leroy' })

// --- novedades (una vez por versión y usuario) ---
assert.equal(currentRelease().version, APP_VERSION)
assert.equal(normalizePreferences({ ...prefs, lastSeenVersion: APP_VERSION }).lastSeenVersion, APP_VERSION)
assert.equal(normalizePreferences({ labels: {} }).lastSeenVersion, undefined)

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
function fakeStore(seed = {}) {
  let movements = [...(seed.movements || [])]
  let balances = { ...(seed.balances || {}) }
  let rules = [...(seed.rules || [])]
  let preferences = { ...(seed.preferences || {}) }
  const listeners = new Set()
  const ruleListeners = new Set()
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
    async saveBalance(year, value) { balances = { ...balances, [String(year)]: Number(value) || 0 } },
    subscribeRules(cb) { ruleListeners.add(cb); cb([...rules]); return () => ruleListeners.delete(cb) },
    async listRules() { return [...rules] },
    async addRule(data) {
      const r = { id: `r-${rules.length}`, ...data }
      rules = [r, ...rules]
      ruleListeners.forEach((cb) => cb([...rules]))
      return r
    },
    async updateRule(id, patch) {
      rules = rules.map((r) => (r.id === id ? { ...r, ...patch } : r))
      ruleListeners.forEach((cb) => cb([...rules]))
      return rules.find((r) => r.id === id)
    },
    async removeRule(id) {
      rules = rules.filter((r) => r.id !== id)
      ruleListeners.forEach((cb) => cb([...rules]))
    },
    async loadPreferences() { return { ...preferences } },
    async savePreferences(prefs) { preferences = { ...prefs }; return preferences }
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

// Movimientos automáticos contra store falso: crea y no duplica.
const baseRule = {
  id: 'r1',
  ...ruleFromForm({
    kind: 'gasto', group: 'Comida', label: 'Comida-Leroy',
    amount: '50', day: '5', startDate: '2026-01-01'
  })
}
const rStore = fakeStore({ rules: [baseRule] })
assert.deepEqual(await runRecurring(rStore, await rStore.listRules(), '2026-03-10'), { created: 3, rules: 1 })
assert.deepEqual(
  (await rStore.listMovements()).map((x) => x.date).sort(),
  ['2026-01-05', '2026-02-05', '2026-03-05']
)
assert.equal((await rStore.listRules())[0].lastRun, '2026-03-05')
assert.deepEqual(await runRecurring(rStore, await rStore.listRules(), '2026-03-10'), { created: 0, rules: 0 })
assert.equal((await rStore.listMovements()).length, 3)
await rStore.savePreferences(prefs)
assert.deepEqual(await rStore.loadPreferences(), prefs)

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
