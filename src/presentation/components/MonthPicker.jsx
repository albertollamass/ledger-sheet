import { MONTHS } from '../../domain/categories.js'

export function MonthPicker({ month, onMonth, onCurrent }) {
  return (
    <div className="flex gap-1.5 flex-wrap items-center" role="group" aria-label="Mes">
      {MONTHS.map((m, i) => (
        <button
          key={m}
          onClick={() => onMonth(i + 1)}
          aria-pressed={month === i + 1}
          className={`px-3 py-1.5 text-sm border ${
            month === i + 1
              ? 'bg-tinta text-white border-tinta font-semibold'
              : 'bg-white border-tinta/25 hover:border-boli hover:text-boli'
          }`}
        >
          {m.slice(0, 3)}
        </button>
      ))}
      <button
        onClick={onCurrent}
        title="Volver al mes actual"
        className="stamp ml-1 px-3 py-1 text-sm text-boli hover:bg-boli hover:text-white active:scale-95 transition"
      >
        Mes actual
      </button>
    </div>
  )
}
