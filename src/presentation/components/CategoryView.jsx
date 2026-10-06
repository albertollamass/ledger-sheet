import { useEffect, useMemo, useState } from 'react'
import { EXPENSE_GROUPS, INCOME_GROUPS, MONTHS } from '../../domain/categories.js'
import { sum } from '../../domain/ledger.js'

export function CategoryView({ movements, year, month, onMonth, onCurrentMonth, fmt }) {
  const [catGroup, setCatGroup] = useCatGroup(movements, year)
  const [catScope, setCatScope] = useCatScope()

  const availableGroups = useMemo(() => {
    const fixed = [...INCOME_GROUPS, ...EXPENSE_GROUPS].map((g) => g.group)
    const extras = [...new Set(movements.map((m) => m.group))].filter((g) => g && !fixed.includes(g))
    return [...fixed, ...extras]
  }, [movements])

  const catData = useMemo(() => {
    if (!catGroup) return null
    const kind = catGroup === 'Ingresos' ? 'ingreso' : 'gasto'
    const inScope = movements.filter(
      (m) => m.year === year && (catScope === 'año' || m.month === month) && m.group === catGroup
    )
    const scopeAll = movements.filter(
      (m) => m.year === year && (catScope === 'año' || m.month === month) && m.kind === kind
    )
    const total = sum(inScope.map((m) => m.amount))
    const scopeTotal = sum(scopeAll.map((m) => m.amount))
    const byLabel = {}
    inScope.forEach((m) => {
      byLabel[m.label] = byLabel[m.label] || { amount: 0, count: 0 }
      byLabel[m.label].amount += m.amount
      byLabel[m.label].count += 1
    })
    const rows = Object.entries(byLabel)
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.amount - a.amount)
    const now = new Date()
    const elapsed =
      year < now.getFullYear() ? 12 : year > now.getFullYear() ? 1 : now.getMonth() + 1
    return { kind, total, scopeTotal, rows, count: inScope.length, avg: total / elapsed }
  }, [movements, year, month, catGroup, catScope])

  return (
    <div className="space-y-6">
      <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Elige categoría">
        {availableGroups.map((g) => (
          <button
            key={g}
            onClick={() => setCatGroup(g)}
            aria-pressed={catGroup === g}
            className={`px-3 py-1.5 text-sm border ${
              catGroup === g
                ? 'bg-tinta text-white border-tinta font-semibold'
                : 'bg-white border-tinta/25 hover:border-boli hover:text-boli'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {catData && (
        <section
          className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)] p-5 sm:p-6"
          aria-label={`Desglose de ${catGroup}`}
        >
          <div className="flex flex-wrap items-center gap-2 self-start">
            <div>
              <p className="font-slab text-lg text-tinta/60">{catGroup}</p>
              <p
                className={`figures font-slab font-bold leading-none text-5xl sm:text-6xl mt-1 ${
                  catData.kind === 'ingreso' ? 'text-haber' : 'text-rojo'
                }`}
              >
                {fmt(catData.total)}
              </p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div
                className="flex text-sm border border-tinta/25 bg-white"
                role="group"
                aria-label="Periodo"
              >
                {[
                  ['mes', MONTHS[month - 1].slice(0, 3)],
                  ['año', String(year)]
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setCatScope(id)}
                    aria-pressed={catScope === id}
                    className={`px-4 py-1.5 border-r last:border-r-0 border-tinta/15 ${
                      catScope === id ? 'bg-tinta text-white font-semibold' : 'hover:bg-papel'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {catScope === 'mes' && (
                <>
                  <select
                    value={month}
                    onChange={(e) => onMonth(Number(e.target.value))}
                    aria-label="Mes"
                    className="text-sm border border-tinta/25 bg-white px-2 py-1.5"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <button
                    onClick={onCurrentMonth}
                    title="Volver al mes actual"
                    className="stamp px-3 py-1 text-sm text-boli hover:bg-boli hover:text-white active:scale-95 transition"
                  >
                    Mes actual
                  </button>
                </>
              )}
            </div>
          </div>
          <p className="text-sm text-tinta/55 mt-2">
            {catData.count} {catData.count === 1 ? 'movimiento' : 'movimientos'}
            {catScope === 'año' && (
              <>, media de {fmt(catData.avg)} al mes</>
            )}
            {catData.scopeTotal > 0 && (
              <>, supone el {Math.round((catData.total / catData.scopeTotal) * 100)} % de lo {catData.kind === 'ingreso' ? 'ingresado' : 'gastado'} en el periodo</>
            )}
          </p>

          <div className="mt-4 border-t-2 border-tinta/60">
            {catData.rows.length === 0 && (
              <p className="text-sm text-tinta/55 py-4">
                Nada en {catGroup} {catScope === 'mes' ? `en ${MONTHS[month - 1].toLowerCase()}` : `en ${year}`}.
              </p>
            )}
            {catData.rows.map((r) => (
              <div
                key={r.label}
                className="flex items-center gap-3 text-sm py-2.5 border-b border-tinta/10 last:border-b-0"
              >
                <div className="w-44 shrink-0">
                  <p className="truncate font-medium">{r.label}</p>
                  <p className="text-xs text-tinta/50">
                    {r.count} {r.count === 1 ? 'movimiento' : 'movimientos'}
                  </p>
                </div>
                <div className="flex-1 h-3 bg-papel border border-tinta/15 overflow-hidden">
                  <div
                    className={`h-full ${catData.kind === 'ingreso' ? 'bg-haber/80' : 'bg-rojo/80'}`}
                    style={{ width: `${catData.total ? (r.amount / catData.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="figures w-28 text-right font-slab font-semibold">{fmt(r.amount)}</p>
                <p className="figures w-12 text-right text-xs text-tinta/50">
                  {catData.total ? `${Math.round((r.amount / catData.total) * 100)} %` : '—'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// Por defecto, la categoría con más gasto del año.
function useCatGroup(movements, year) {
  const [catGroup, setCatGroup] = useState(null)
  useEffect(() => {
    if (catGroup) return
    const tot = {}
    movements
      .filter((m) => m.year === year && m.kind === 'gasto')
      .forEach((m) => {
        tot[m.group] = (tot[m.group] || 0) + m.amount
      })
    const top = Object.entries(tot).sort((a, b) => b[1] - a[1])[0]?.[0]
    setCatGroup(top ?? 'Comida')
  }, [movements, year, catGroup])
  return [catGroup, setCatGroup]
}

function useCatScope() {
  const [catScope, setCatScope] = useState('mes')
  return [catScope, setCatScope]
}
