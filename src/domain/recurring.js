// Dominio: movimientos recurrentes (pagos/ingresos que se repiten cada mes).
// Puro, sin dependencias. Una regla guarda el día del mes y desde cuándo aplica;
// la app crea el movimiento cuando llega ese día (o al abrirla más tarde).

import { localISODate } from './dates.js'

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

const parseISO = (s) => {
  const m = ISO_RE.exec(String(s || ''))
  return m ? { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) } : null
}

export const clampDay = (day) => Math.min(31, Math.max(1, Math.trunc(Number(day) || 1)))

// Día efectivo: si el mes no tiene ese día (31 en febrero) se usa el último.
export function dayInMonth(year, month, day) {
  const last = new Date(year, month, 0).getDate()
  return Math.min(clampDay(day), last)
}

export function occurrenceDate(year, month, day) {
  const d = dayInMonth(year, month, day)
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// Construye una regla válida desde los valores del formulario.
export function ruleFromForm({ kind, group, label, amount, day, startDate, note, active = true }) {
  return {
    kind: kind === 'ingreso' ? 'ingreso' : 'gasto',
    group: group || 'Otros',
    label: label || 'Otros',
    amount: Number(String(amount).replace(',', '.')) || 0,
    day: clampDay(day),
    startDate: ISO_RE.test(String(startDate || '')) ? startDate : localISODate(),
    note: note || '',
    active: active !== false,
    lastRun: null
  }
}

// Fechas que ya tocan y todavía no se han apuntado (desde startDate hasta hoy).
export function dueOccurrences(rule, todayISO = localISODate()) {
  if (!rule || rule.active === false) return []
  const start = parseISO(rule.startDate) ?? parseISO(todayISO)
  const today = parseISO(todayISO)
  if (!start || !today) return []

  const out = []
  let year = start.year
  let month = start.month
  while (year < today.year || (year === today.year && month <= today.month)) {
    const date = occurrenceDate(year, month, rule.day)
    if (date >= rule.startDate && date <= todayISO && (!rule.lastRun || date > rule.lastRun)) {
      out.push(date)
    }
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
    if (out.length >= 60) break
  }
  return out
}

// Siguiente fecha que se apuntará (incluye el propio día si aún no se ha apuntado).
export function nextOccurrence(rule, fromISO = localISODate()) {
  if (!rule || rule.active === false) return null
  const from = parseISO(fromISO)
  const start = parseISO(rule.startDate) ?? from
  if (!from || !start) return null

  let year = Math.max(from.year, start.year)
  let month = year === from.year ? from.month : 1
  if (year === start.year && month < start.month) month = start.month

  for (let i = 0; i < 1200; i += 1) {
    const date = occurrenceDate(year, month, rule.day)
    if (
      date >= fromISO &&
      date >= rule.startDate &&
      (!rule.lastRun || date > rule.lastRun)
    ) {
      return date
    }
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return null
}

// Movimiento que genera una regla en una fecha concreta.
export function movementFromRule(rule, date) {
  const d = parseISO(date) ?? parseISO(localISODate())
  return {
    kind: rule.kind === 'ingreso' ? 'ingreso' : 'gasto',
    group: rule.group || 'Otros',
    label: rule.label || 'Otros',
    amount: Number(rule.amount) || 0,
    date,
    year: d.year,
    month: d.month,
    note: rule.note || '',
    recurringId: rule.id ?? null
  }
}
