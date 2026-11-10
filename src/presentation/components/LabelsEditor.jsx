import { useEffect, useMemo, useState } from 'react'
import { EXPENSE_GROUPS, INCOME_GROUPS } from '../../domain/categories.js'

// Catálogo editable: grupos y tipos fijos + los que hayan llegado de un Excel.
function buildCatalog(movements) {
  const map = new Map()
  ;[...INCOME_GROUPS, ...EXPENSE_GROUPS].forEach((g) => {
    map.set(g.group, { group: g.group, items: [...g.items] })
  })
  for (const m of movements || []) {
    if (!m.group || !m.label) continue
    if (!map.has(m.group)) map.set(m.group, { group: m.group, items: [] })
    const entry = map.get(m.group)
    if (!entry.items.includes(m.label)) entry.items.push(m.label)
  }
  return [...map.values()]
}

const overridesOf = (names) =>
  Object.fromEntries(
    Object.entries(names)
      .map(([key, value]) => [key, value.trim()])
      .filter(([key, value]) => value && value !== key)
  )

export function LabelsEditor({ preferences, movements, onSave, onClose }) {
  const catalog = useMemo(() => buildCatalog(movements), [movements])
  const [query, setQuery] = useState('')
  const [groupNames, setGroupNames] = useState(() => {
    const out = {}
    catalog.forEach(({ group }) => {
      out[group] = preferences?.groups?.[group] ?? group
    })
    return out
  })
  const [labelNames, setLabelNames] = useState(() => {
    const out = {}
    catalog.forEach(({ items }) => {
      items.forEach((label) => {
        out[label] = preferences?.labels?.[label] ?? label
      })
    })
    return out
  })

  // Si entretanto llegan grupos/tipos nuevos, se añaden al editor.
  useEffect(() => {
    setGroupNames((prev) => {
      const next = { ...prev }
      catalog.forEach(({ group }) => {
        if (!(group in next)) next[group] = preferences?.groups?.[group] ?? group
      })
      return next
    })
    setLabelNames((prev) => {
      const next = { ...prev }
      catalog.forEach(({ items }) => {
        items.forEach((label) => {
          if (!(label in next)) next[label] = preferences?.labels?.[label] ?? label
        })
      })
      return next
    })
  }, [catalog, preferences])

  const q = query.trim().toLowerCase()
  const visible = catalog
    .map(({ group, items }) => ({
      group,
      items: items.filter(
        (label) =>
          !q ||
          group.toLowerCase().includes(q) ||
          (groupNames[group] ?? '').toLowerCase().includes(q) ||
          label.toLowerCase().includes(q) ||
          (labelNames[label] ?? '').toLowerCase().includes(q)
      )
    }))
    .filter(({ group, items }) => items.length > 0 || (!q && groupNames[group]))

  const reset = () => {
    const groups = {}
    const labels = {}
    catalog.forEach(({ group, items }) => {
      groups[group] = group
      items.forEach((label) => {
        labels[label] = label
      })
    })
    setGroupNames(groups)
    setLabelNames(labels)
  }

  return (
    <div className="fixed top-0 left-0 w-full z-50 overflow-y-auto bg-tinta/50" style={{ height: '100dvh' }}>
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.25)] w-full max-w-2xl max-h-[85vh] overflow-auto my-auto">
          <div className="border-b-[3px] border-double border-tinta/30 px-5 pt-4 pb-3">
            <h2 className="font-slab font-semibold text-xl">Nombres de tu cuaderno</h2>
            <p className="text-sm text-tinta/60 mt-1">
              Cambia cómo se llaman los grupos y tipos solo en tu cuenta. Los datos guardados no se tocan.
            </p>
          </div>

          <div className="p-5 space-y-4">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar grupo o tipo…"
              aria-label="Buscar grupo o tipo"
              className="w-full border border-tinta/25 px-3 py-2 text-sm placeholder:text-tinta/30 focus:border-boli"
            />

            {visible.map(({ group, items }) => (
              <div key={group} className="border border-tinta/20 p-3">
                <label className="block">
                  <span className="block text-[11px] text-tinta/45 mb-0.5">Grupo</span>
                  <input
                    value={groupNames[group] ?? group}
                    onChange={(e) => setGroupNames((prev) => ({ ...prev, [group]: e.target.value }))}
                    className="w-full border-b border-tinta/30 focus:border-boli focus:border-b-2 py-1 font-slab font-semibold"
                    aria-label={`Nombre del grupo ${group}`}
                  />
                </label>
                <div className="grid sm:grid-cols-2 gap-x-3 gap-y-2 mt-2">
                  {items.map((label) => (
                    <label key={label} className="block min-w-0">
                      <span className="block text-[11px] text-tinta/45 mb-0.5 truncate" title={label}>
                        {label}
                      </span>
                      <input
                        value={labelNames[label] ?? label}
                        onChange={(e) => setLabelNames((prev) => ({ ...prev, [label]: e.target.value }))}
                        className="w-full border-b border-tinta/30 focus:border-boli focus:border-b-2 py-1 text-sm"
                        aria-label={`Nombre del tipo ${label}`}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {visible.length === 0 && (
              <p className="text-sm text-tinta/55">No hay grupos ni tipos que coincidan con «{query}».</p>
            )}

            <p className="text-xs text-tinta/50">
              Deja un nombre vacío o igual al original para volver al de siempre.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={reset}
                className="border border-tinta/30 px-3 py-2 text-sm font-semibold hover:border-tinta"
              >
                Restablecer todo
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={onClose}
                className="border border-tinta/30 px-4 py-2 font-semibold hover:border-tinta"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => onSave({ groups: overridesOf(groupNames), labels: overridesOf(labelNames) })}
                className="bg-tinta text-white px-4 py-2 font-semibold hover:bg-boli active:scale-[0.98] transition"
              >
                Guardar nombres
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
