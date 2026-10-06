import { EXPENSE_GROUPS, INCOME_GROUPS, MONTHS } from '../../domain/categories.js'
import { sum } from '../../domain/ledger.js'

export function AnnualView({ incomeByMonth, expenseByMonth, acumulado, byGroup, totalIncome, month, fmt }) {
  const sections = (() => {
    const fixed = [...INCOME_GROUPS, ...EXPENSE_GROUPS]
    const extras = Object.keys(byGroup)
      .filter((g) => !fixed.some((f) => f.group === g))
      .map((g) => ({ group: g, items: Object.keys(byGroup[g]).sort() }))
    return [...fixed, ...extras]
  })()

  return (
    <>
      <section className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)] overflow-x-auto" aria-label="Meses del año">
        <table className="figures w-full text-sm min-w-[1768px] table-fixed border-separate border-spacing-0">
          <colgroup>
            <col className="w-52" />
            {MONTHS.map((m) => (
              <col key={m} className="w-[7.5rem]" />
            ))}
            <col className="w-[7.5rem]" />
          </colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 bg-papel text-left p-2.5 font-medium text-tinta/60 border-b-2 border-r border-tinta/60"></th>
              {MONTHS.map((m, i) => (
                <th key={m} className={`sticky top-0 z-10 p-2.5 text-right border-b-2 border-tinta/60 ${i === month - 1 ? 'bg-[#dfe6fb] text-boli font-semibold' : 'bg-papel font-medium text-tinta/60'}`}>{m.slice(0, 3)}</th>
              ))}
              <th className="sticky top-0 z-10 bg-papel p-2.5 text-right font-medium text-tinta/60 border-b-2 border-tinta/60">Total</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Ingresos', incomeByMonth, 'text-haber font-semibold'],
              ['Gastos', expenseByMonth, 'text-rojo font-semibold'],
              ['Neto', incomeByMonth.map((v, i) => v - expenseByMonth[i]), 'font-semibold'],
              ['Acumulado', acumulado, 'italic text-tinta/50']
            ].map(([label, arr, cls]) => (
              <tr key={label}>
                <td className="sticky left-0 z-[1] bg-white p-2.5 font-slab font-semibold border-b border-r border-tinta/10">{label}</td>
                {arr.map((v, i) => (
                  <td key={i} className={`p-2.5 text-right border-b border-tinta/10 ${i === month - 1 ? 'bg-[#eef2fd]' : 'bg-white'} ${cls}`}>{fmt(v)}</td>
                ))}
                <td className={`p-2.5 text-right bg-white border-b border-tinta/10 ${cls}`}>{label === 'Acumulado' ? '' : fmt(sum(arr))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {sections.map(({ group, items }) => {
        const rows = items.map((label) => ({ label, months: byGroup[group]?.[label] ?? Array(12).fill(0) }))
        const total = Array(12).fill(0)
        rows.forEach((r) => r.months.forEach((v, i) => (total[i] += v)))
        const isIncome = INCOME_GROUPS.some((g) => g.group === group)
        return (
          <section key={group} className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)] overflow-x-auto" aria-label={group}>
            <h3 className="font-slab font-semibold text-lg px-4 pt-4 pb-2 border-b-2 border-tinta/60">{group}</h3>
            <table className="figures w-full text-sm min-w-[1768px] table-fixed border-separate border-spacing-0">
              <colgroup>
                <col className="w-52" />
                {MONTHS.map((m) => (
                  <col key={m} className="w-[7.5rem]" />
                ))}
                <col className="w-[7.5rem]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-30 bg-white p-2 font-medium border-b border-r border-tinta/20"></th>
                  {MONTHS.map((m, i) => (
                    <th key={m} className={`sticky top-0 z-10 p-2 text-right font-medium border-b border-tinta/20 ${i === month - 1 ? 'bg-[#dfe6fb] text-boli font-semibold' : 'bg-white text-tinta/50'}`}>{m.slice(0, 3)}</th>
                  ))}
                  <th className="sticky top-0 z-10 p-2 text-right font-medium text-tinta/50 bg-white border-b border-tinta/20">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label}>
                    <td className="sticky left-0 z-[1] bg-white p-2.5 w-52 border-b border-r border-tinta/10">{r.label}</td>
                    {r.months.map((v, i) => (
                      <td key={i} className={`p-2.5 text-right border-b border-tinta/10 ${i === month - 1 ? 'bg-[#eef2fd]' : 'bg-white'} text-tinta/60`}>{v ? fmt(v) : ''}</td>
                    ))}
                    <td className="p-2.5 text-right font-semibold bg-white border-b border-tinta/10">{fmt(sum(r.months))}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="sticky left-0 z-[1] bg-papel p-2.5 font-slab border-b-2 border-r border-tinta/60">Total {group}</td>
                  {total.map((v, i) => (
                    <td key={i} className={`p-2.5 text-right border-b-2 border-tinta/60 ${i === month - 1 ? 'bg-[#dfe6fb]' : 'bg-papel'}`}>{fmt(v)}</td>
                  ))}
                  <td className="p-2.5 text-right bg-papel border-b-2 border-tinta/60">{fmt(sum(total))}</td>
                </tr>
                {!isIncome && (
                  <tr className="text-xs text-tinta/50">
                    <td className="sticky left-0 z-[1] bg-white p-2.5 border-r border-tinta/10">Tanto del ingreso</td>
                    {total.map((v, i) => (
                      <td key={i} className={`p-2.5 text-right ${i === month - 1 ? 'bg-[#eef2fd]' : 'bg-white'}`}>
                        {incomeByMonth[i] ? `${Math.round((v / incomeByMonth[i]) * 100)} %` : '—'}
                      </td>
                    ))}
                    <td className="p-2.5 text-right bg-white">{totalIncome ? `${Math.round((sum(total) / totalIncome) * 100)} %` : '—'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )
      })}
    </>
  )
}
