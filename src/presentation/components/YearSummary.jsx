import { BalanceInput } from './BalanceInput.jsx'

export function YearSummary({ year, balanceValue, onSaveBalance, masked, totalIncome, totalExpense, net, acumuladoDic, fmt }) {
  return (
    <section aria-label={`Resumen de ${year}`} className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)]">
      <dl className="grid grid-cols-2 md:grid-cols-5 divide-x divide-tinta/10">
        <div className="p-4">
          <dt className="text-xs text-tinta/55">Saldo inicial {year}</dt>
          <dd className="mt-1">
            <BalanceInput
              value={balanceValue}
              onSave={onSaveBalance}
              masked={masked}
              inputClassName="figures text-xl font-slab font-semibold w-full bg-transparent"
            />
          </dd>
        </div>
        <div className="p-4">
          <dt className="text-xs text-tinta/55">Ingresos del año</dt>
          <dd className="figures mt-1 text-xl font-slab font-semibold text-haber">{fmt(totalIncome)}</dd>
        </div>
        <div className="p-4">
          <dt className="text-xs text-tinta/55">Gastos del año</dt>
          <dd className="figures mt-1 text-xl font-slab font-semibold text-rojo">{fmt(totalExpense)}</dd>
        </div>
        <div className="p-4">
          <dt className="text-xs text-tinta/55">Neto</dt>
          <dd className={`figures mt-1 text-xl font-slab font-semibold ${net >= 0 ? 'text-haber' : 'text-rojo'}`}>{fmt(net)}</dd>
        </div>
        <div className="p-4 col-span-2 md:col-span-1">
          <dt className="text-xs text-tinta/55">Acumulado a diciembre</dt>
          <dd className="figures mt-1 text-xl font-slab font-semibold">{fmt(acumuladoDic)}</dd>
        </div>
      </dl>
    </section>
  )
}
