import { MONTHS, groupOfLabel } from '../../domain/categories.js'
import { MonthPicker } from './MonthPicker.jsx'

export function MonthView({ year, month, onMonth, onCurrentMonth, monthMovs, monthIncome, monthExpense, onRemove, fmt }) {
  return (
    <div className="space-y-6">
      <MonthPicker month={month} onMonth={onMonth} onCurrent={onCurrentMonth} />

      {/* Lo característico: el gasto del mes, grande, en rojo contable */}
      <section aria-label={`${MONTHS[month - 1]} de ${year}`} className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)] p-5 sm:p-8 flex flex-wrap items-end gap-x-10 gap-y-6">
        <div>
          <p className="font-slab text-rojo text-lg">Gastado en {MONTHS[month - 1].toLowerCase()}</p>
          <p className="figures font-slab font-bold text-rojo leading-none text-6xl sm:text-7xl mt-1">
            {fmt(monthExpense)}
          </p>
          <p className="text-sm text-tinta/55 mt-2">
            Ingresado <span className="figures font-semibold text-haber">{fmt(monthIncome)}</span>
          </p>
        </div>
        <div
          className={`stamp figures ml-auto w-32 h-32 sm:w-36 sm:h-36 -rotate-6 flex flex-col items-center justify-center text-center leading-tight ${
            monthIncome - monthExpense >= 0 ? 'text-haber' : 'text-rojo'
          }`}
          aria-label={`Neto del mes: ${fmt(monthIncome - monthExpense)}`}
        >
          <span className="text-[11px] font-medium">neto</span>
          <span className="font-slab font-bold text-xl sm:text-2xl px-2">{fmt(monthIncome - monthExpense)}</span>
        </div>
      </section>

      {/* Gasto por tipo */}
      <section className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)] p-5" aria-label={`Gasto por tipo en ${MONTHS[month - 1]}`}>
        <h3 className="font-slab font-semibold text-lg border-b-2 border-tinta/60 pb-2 mb-2">
          Por tipo en {MONTHS[month - 1].toLowerCase()}
        </h3>
        {(() => {
          const agg = {}
          monthMovs.filter((m) => m.kind === 'gasto').forEach((m) => {
            agg[m.label] = (agg[m.label] || 0) + m.amount
          })
          const max = Math.max(1, ...Object.values(agg))
          const entries = Object.entries(agg).sort((a, b) => b[1] - a[1])
          if (!entries.length) return <p className="text-sm text-tinta/55 py-2">Sin gastos este mes. Anota el primero con Añadir movimiento.</p>
          return entries.map(([label, v]) => (
            <div key={label} className="flex items-center gap-3 text-sm py-1.5 border-b border-tinta/10 last:border-b-0">
              <div className="w-44 shrink-0">
                <p className="truncate font-medium">{label}</p>
                <p className="text-xs text-tinta/50">{groupOfLabel(label)}</p>
              </div>
              <div className="flex-1 h-3 bg-papel border border-tinta/15 overflow-hidden">
                <div className="bg-rojo/80 h-full" style={{ width: `${(v / max) * 100}%` }} />
              </div>
              <div className="figures w-28 text-right font-slab font-semibold">{fmt(v)}</div>
            </div>
          ))
        })()}
      </section>
      <section className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)]" aria-label={`Movimientos de ${MONTHS[month - 1]}`}>
        {monthMovs.length === 0 && <p className="p-5 text-sm text-tinta/55">No hay movimientos.</p>}
        {monthMovs.map((m) => (
          <div key={m.id} className="p-4 flex items-center gap-3 text-sm border-b border-tinta/10 last:border-b-0 hover:bg-boli/[0.03]">
            <span aria-hidden="true" className={`w-1 self-stretch ${m.kind === 'ingreso' ? 'bg-haber' : 'bg-rojo'}`} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{m.label}</p>
              <p className="text-xs text-tinta/50">{m.group}, {m.date}{m.note ? `, ${m.note}` : ''}</p>
            </div>
            <p className={`figures font-slab font-semibold text-base ${m.kind === 'ingreso' ? 'text-haber' : 'text-rojo'}`}>
              {m.kind === 'ingreso' ? '+' : '−'}{fmt(m.amount)}
            </p>
            <button onClick={() => onRemove(m.id)} aria-label={`Borrar ${m.label}`} className="text-tinta/25 hover:text-rojo px-2 text-base">✕</button>
          </div>
        ))}
      </section>
    </div>
  )
}
