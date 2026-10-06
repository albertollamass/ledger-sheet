// Dominio: agregados del cuaderno. Puro, sin dependencias.

// Agrega movimientos a matriz [grupo][tipo][mes] como en el Excel
export function buildYearMatrix(movements, year) {
  // returns { incomeByMonth[12], expenseByMonth[12], byGroup: {group: {label: [12]}} }
  const incomeByMonth = Array(12).fill(0)
  const expenseByMonth = Array(12).fill(0)
  const byGroup = {}

  const ensure = (group, label) => {
    if (!byGroup[group]) byGroup[group] = {}
    if (!byGroup[group][label]) byGroup[group][label] = Array(12).fill(0)
  }

  for (const m of movements) {
    if (m.year !== year) continue
    const idx = (m.month || 1) - 1
    ensure(m.group, m.label)
    byGroup[m.group][m.label][idx] += m.amount
    if (m.kind === 'ingreso') incomeByMonth[idx] += m.amount
    else expenseByMonth[idx] += m.amount
  }
  return { incomeByMonth, expenseByMonth, byGroup }
}

export const sum = (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0)
