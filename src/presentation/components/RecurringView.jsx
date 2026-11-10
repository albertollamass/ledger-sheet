import { useEffect, useMemo, useState } from 'react'
import { EXPENSE_GROUPS, INCOME_GROUPS } from '../../domain/categories.js'
import { displayGroup, displayLabel, personalizeGroups } from '../../domain/catalog.js'
import { localISODate } from '../../domain/dates.js'
import { nextOccurrence } from '../../domain/recurring.js'

const baseGroups = (kind) => (kind === 'ingreso' ? INCOME_GROUPS : EXPENSE_GROUPS)

const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export function RecurringView({ rules, onAdd, onToggle, onRemove, fmt, preferences }) {
  const [kind, setKind] = useState('gasto')
  const groups = useMemo(() => personalizeGroups(baseGroups(kind), preferences), [kind, preferences])
  const [group, setGroup] = useState(baseGroups('gasto')[0].group)
  const currentGroup = groups.find((g) => g.group === group) ?? groups[0]
  const [label, setLabel] = useState(baseGroups('gasto')[0].items[0])
  const [amount, setAmount] = useState('')
  const [day, setDay] = useState(String(new Date().getDate()))
  const [startDate, setStartDate] = useState(localISODate())
  const [note, setNote] = useState('')

  useEffect(() => {
    const gs = baseGroups(kind)
    if (!gs.some((g) => g.group === group)) {
      setGroup(gs[0].group)
      setLabel(gs[0].items[0])
    }
  }, [kind]) // eslint-disable-line

  const sorted = useMemo(
    () => [...rules].sort((a, b) => Number(a.day) - Number(b.day) || a.label.localeCompare(b.label)),
    [rules]
  )

  const today = localISODate()

  return (
    <div className="space-y-6">
      <section className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)] p-5 sm:p-6" aria-label="Crear movimiento automático">
        <div className="border-b-2 border-tinta/60 pb-2 mb-4">
          <h3 className="font-slab font-semibold text-lg">Nuevo movimiento automático</h3>
          <p className="text-sm text-tinta/55 mt-1">
            Se apunta solo el día que elijas de cada mes. Si abres la app más tarde, se pone al día.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            onAdd({ kind, group: currentGroup.group, label, amount, day, startDate, note })
            setAmount('')
            setNote('')
          }}
        >
          <div className="grid grid-cols-2 border border-tinta/25" role="group" aria-label="Tipo de movimiento automático">
            {[
              ['gasto', 'Gasto', 'sale dinero'],
              ['ingreso', 'Ingreso', 'entra dinero']
            ].map(([k, title, sub]) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={`py-2 px-1 text-left ${
                  kind === k
                    ? k === 'gasto'
                      ? 'bg-rojo text-white'
                      : 'bg-haber text-white'
                    : 'bg-white hover:bg-papel'
                }`}
              >
                <span className="block font-slab font-semibold leading-none">{title}</span>
                <span className={`block text-[11px] mt-0.5 ${kind === k ? 'text-white/80' : 'text-tinta/50'}`}>{sub}</span>
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs text-tinta/55 mb-1">Grupo</span>
              <select
                value={currentGroup.group}
                onChange={(e) => {
                  setGroup(e.target.value)
                  setLabel((groups.find((g) => g.group === e.target.value)?.items ?? [])[0]?.value ?? '')
                }}
                className="w-full border-b border-tinta/30 focus:border-boli focus:border-b-2 py-1.5 text-sm"
              >
                {groups.map((g) => (
                  <option key={g.group} value={g.group}>{g.groupLabel}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs text-tinta/55 mb-1">Tipo</span>
              <select
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full border-b border-tinta/30 focus:border-boli focus:border-b-2 py-1.5 text-sm"
              >
                {currentGroup.items.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="block text-xs text-tinta/55 mb-1">Importe en euros</span>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="figures w-full border-b border-tinta/30 focus:border-boli focus:border-b-2 py-1.5 font-slab font-semibold text-lg"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-tinta/55 mb-1">Día de cada mes</span>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="figures w-full border-b border-tinta/30 focus:border-boli focus:border-b-2 py-1.5 text-sm"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs text-tinta/55 mb-1">Empezar el</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border-b border-tinta/30 focus:border-boli focus:border-b-2 py-1.5 text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-xs text-tinta/55 mb-1">Nota (si quieres)</span>
            <input
              placeholder="Alquiler, nómina, suscripción…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border-b border-tinta/30 focus:border-boli focus:border-b-2 py-1.5 text-sm placeholder:text-tinta/30"
            />
          </label>

          <button className="stamp w-full text-boli py-2.5 font-semibold hover:bg-boli hover:text-white active:scale-[0.98] transition">
            Crear movimiento automático
          </button>
          <p className="text-xs text-tinta/50">
            Si el mes no tiene ese día (por ejemplo, el 31 en febrero), se usa el último día del mes.
          </p>
        </form>
      </section>

      <section className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)]" aria-label="Movimientos automáticos">
        <div className="px-4 pt-4 pb-2 border-b-2 border-tinta/60">
          <h3 className="font-slab font-semibold text-lg">Tus movimientos automáticos</h3>
          <p className="text-sm text-tinta/55">
            {sorted.length === 0
              ? 'Todavía no hay ninguno.'
              : `${sorted.filter((r) => r.active !== false).length} activos de ${sorted.length}.`}
          </p>
        </div>
        {sorted.length === 0 && (
          <p className="p-5 text-sm text-tinta/55">
            Crea una regla arriba para no tener que apuntar cada mes el alquiler, la nómina, las suscripciones…
          </p>
        )}
        {sorted.map((r) => {
          const next = nextOccurrence(r, today)
          const paused = r.active === false
          return (
            <div key={r.id} className={`p-4 flex items-start gap-3 text-sm border-b border-tinta/10 last:border-b-0 ${paused ? 'opacity-60' : ''}`}>
              <span aria-hidden="true" className={`w-1 self-stretch ${r.kind === 'ingreso' ? 'bg-haber' : 'bg-rojo'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {displayLabel(preferences, r.label)}
                  {paused && <span className="ml-2 text-xs font-normal text-tinta/50">pausado</span>}
                </p>
                <p className="text-xs text-tinta/50">
                  {displayGroup(preferences, r.group)} · día {r.day} de cada mes ·{' '}
                  <span className={r.kind === 'ingreso' ? 'text-haber' : 'text-rojo'}>{fmt(r.amount)}</span>
                </p>
                <p className="text-xs text-tinta/50">
                  Próximo: {next ? fmtDate(next) : '—'}
                  {r.lastRun ? ` · último: ${fmtDate(r.lastRun)}` : ''}
                  {r.note ? ` · ${r.note}` : ''}
                </p>
              </div>
              <button
                onClick={() => onToggle(r)}
                className="shrink-0 border border-tinta/25 px-2.5 py-1 text-xs hover:border-boli hover:text-boli"
              >
                {paused ? 'Activar' : 'Pausar'}
              </button>
              <button
                onClick={() => onRemove(r.id)}
                aria-label={`Borrar ${displayLabel(preferences, r.label)}`}
                className="shrink-0 text-tinta/25 hover:text-rojo px-2 text-base"
              >
                ✕
              </button>
            </div>
          )
        })}
      </section>
    </div>
  )
}
