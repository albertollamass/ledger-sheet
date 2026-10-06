import { useEffect, useState } from 'react'
import { EXPENSE_GROUPS, INCOME_GROUPS } from '../../domain/categories.js'
import { toISODate } from '../../domain/dates.js'

export function MovementForm({ onSave, initial }) {
  const [kind, setKind] = useState(initial?.kind ?? 'gasto')
  const groups = kind === 'ingreso' ? INCOME_GROUPS : EXPENSE_GROUPS
  const [group, setGroup] = useState(initial?.group ?? groups[0].group)
  const currentGroup = groups.find((g) => g.group === group) ?? groups[0]
  const [label, setLabel] = useState(initial?.label ?? currentGroup.items[0])
  const [amount, setAmount] = useState(initial?.amount ?? '')
  const [date, setDate] = useState(initial?.date ?? toISODate())
  const [note, setNote] = useState(initial?.note ?? '')

  useEffect(() => {
    const gs = kind === 'ingreso' ? INCOME_GROUPS : EXPENSE_GROUPS
    if (!gs.some((g) => g.group === group)) {
      setGroup(gs[0].group)
      setLabel(gs[0].items[0])
    }
  }, [kind]) // eslint-disable-line

  return (
    <form
      className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)]"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ kind, group: currentGroup.group, label, amount, date, note })
        setAmount('')
        setNote('')
      }}
    >
      <div className="border-b-[3px] border-double border-tinta/30 px-4 pt-4 pb-3">
        <h2 className="font-slab font-semibold text-xl">Nuevo movimiento</h2>
        <p className="text-xs text-tinta/55">Queda guardado en su mes y su tipo.</p>
      </div>
      <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 border border-tinta/25" role="group" aria-label="Tipo de movimiento">
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
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs text-tinta/55 mb-1">Grupo</span>
          <select value={group} onChange={(e) => { setGroup(e.target.value); setLabel((groups.find(g=>g.group===e.target.value)?.items ?? [])[0] ?? '') }} className="w-full border-b border-tinta/30 focus:border-boli focus:border-b-2 py-1.5 text-sm">
            {groups.map((g) => (
              <option key={g.group} value={g.group}>{g.group}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-tinta/55 mb-1">Tipo</span>
          <select value={label} onChange={(e) => setLabel(e.target.value)} className="w-full border-b border-tinta/30 focus:border-boli focus:border-b-2 py-1.5 text-sm">
            {currentGroup.items.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs text-tinta/55 mb-1">Importe en euros</span>
          <input required type="number" step="0.01" min="0" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} className="figures w-full border-b border-tinta/30 focus:border-boli focus:border-b-2 py-1.5 font-slab font-semibold text-lg" />
        </label>
        <label className="block">
          <span className="block text-xs text-tinta/55 mb-1">Fecha</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border-b border-tinta/30 focus:border-boli focus:border-b-2 py-1.5 text-sm" />
        </label>
      </div>
      <label className="block">
        <span className="block text-xs text-tinta/55 mb-1">Nota (si quieres)</span>
        <input placeholder="Café con…" value={note} onChange={(e) => setNote(e.target.value)} className="w-full border-b border-tinta/30 focus:border-boli focus:border-b-2 py-1.5 text-sm placeholder:text-tinta/30" />
      </label>
      <button className="stamp w-full text-boli py-2.5 font-semibold hover:bg-boli hover:text-white active:scale-[0.98] transition">
        Guardar {kind}
      </button>
      </div>
    </form>
  )
}
