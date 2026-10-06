import { useMemo } from 'react'
import { buildYearMatrix, sum } from '../../domain/ledger.js'

export function HistoryView({ movements, years, onOpenYear, fmt }) {
  const history = useMemo(() => {
    return years.map((y) => {
      const { incomeByMonth: ib, expenseByMonth: eb } = buildYearMatrix(movements, y)
      return { year: y, income: sum(ib), expense: sum(eb), net: sum(ib) - sum(eb) }
    })
  }, [movements, years])

  return (
    <section className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)] p-5" aria-label="Historial por años">
      <h3 className="font-slab font-semibold text-lg border-b-2 border-tinta/60 pb-2 mb-1">Historial por años</h3>
      <table className="figures w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-tinta/55 border-b border-tinta/15">
            <th className="py-2 pr-2 font-medium">Año</th>
            <th className="p-2 text-right font-medium">Ingresos</th>
            <th className="p-2 text-right font-medium">Gastos</th>
            <th className="p-2 text-right font-medium">Neto</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => {
            const max = Math.max(1, ...history.map((x) => x.expense))
            return (
              <tr key={h.year} className="border-b border-tinta/10 last:border-b-0 hover:bg-boli/[0.03]">
                <td className="py-2.5 pr-2">
                  <button onClick={() => onOpenYear(h.year)} className="font-slab font-semibold text-lg underline decoration-boli/40 underline-offset-4 hover:text-boli">{h.year}</button>
                  <div className="h-1.5 bg-papel border border-tinta/15 mt-1.5 max-w-[220px]" aria-hidden="true">
                    <div className="h-full bg-tinta/70" style={{ width: `${(h.expense / max) * 100}%` }} />
                  </div>
                </td>
                <td className="p-2.5 text-right text-haber">{fmt(h.income)}</td>
                <td className="p-2.5 text-right text-rojo">{fmt(h.expense)}</td>
                <td className="p-2.5 text-right font-slab font-semibold">{fmt(h.net)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="text-xs text-tinta/50 mt-3">Toca un año para abrir su página.</p>
    </section>
  )
}
