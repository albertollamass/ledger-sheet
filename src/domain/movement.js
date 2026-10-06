// Dominio: movimiento. Puro, sin dependencias.

export const MOVEMENT_KINDS = ['gasto', 'ingreso']

export const keyOf = (m) => `${m.year}|${m.month}|${m.label}|${m.amount}`

// Construye un movimiento válido desde los valores del formulario.
// Misma semántica que siempre: importes no numéricos valen 0.
export function movementFromForm({ kind, group, label, amount, date, note }) {
  const d = new Date(`${date}T12:00:00`)
  return {
    kind: kind === 'ingreso' ? 'ingreso' : 'gasto',
    group: group || 'Otros',
    label: label || 'Otros',
    amount: Number(String(amount).replace(',', '.')) || 0,
    date,
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    note: note || ''
  }
}
