import { useEffect, useState } from 'react'

export function BalanceInput({ value, onSave, inputClassName, masked }) {
  const fmt = (v) => (v === undefined || v === null || v === '' ? '' : String(v))
  const [draft, setDraft] = useState(fmt(value))
  useEffect(() => setDraft(fmt(value)), [value])
  if (masked) {
    return <p className={inputClassName}>****</p>
  }
  const dirty = draft !== fmt(value)
  const commit = () => {
    if (draft === fmt(value)) return
    onSave(draft === '' ? 0 : Number(String(draft).replace(',', '.')) || 0)
  }
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        step="0.01"
        placeholder="0,00"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className={inputClassName}
      />
      {dirty && (
        <button onClick={commit} className="text-xs bg-tinta text-white px-2 py-1 shrink-0 hover:bg-boli active:scale-95 transition">
          Guardar
        </button>
      )}
    </div>
  )
}
