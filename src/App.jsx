import { useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch
} from 'firebase/firestore'
import { auth, db, googleProvider, isFirebaseConfigured } from './firebase'
import { keyOf, parseExcelFile } from './excelImport'
import { EXPENSE_GROUPS, INCOME_GROUPS, MONTHS } from './categories'
import { buildYearMatrix, eur, sum, toISODate } from './utils'

const ALL_GROUPS = [...INCOME_GROUPS, ...EXPENSE_GROUPS]
const groupOf = (label) => ALL_GROUPS.find((g) => g.items.includes(label))?.group ?? 'Otros'

function useLocalDemo() {
  const [movements, setMovements] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('demo-movements') || '[]')
    } catch {
      return []
    }
  })
  const [balances, setBalances] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('demo-balances') || '{}')
    } catch {
      return {}
    }
  })
  useEffect(() => localStorage.setItem('demo-movements', JSON.stringify(movements)), [movements])
  useEffect(() => localStorage.setItem('demo-balances', JSON.stringify(balances)), [balances])
  return { movements, setMovements, balances, setBalances }
}

function Login({ onDemo }) {
  const [err, setErr] = useState('')

  const loginGoogle = async () => {
    setErr('')
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e2) {
      setErr(e2.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold">Ingresos y Gastos</h1>
        <p className="text-sm text-slate-500 mt-1">Tu plantilla de Excel, ahora en web con Firebase.</p>
        {!isFirebaseConfigured && (
          <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded p-3">
            Firebase no configurado. Puedes probar en <b>modo demo local</b> o seguir la guía{' '}
            <code>FIREBASE_SETUP.md</code> para conectar tu proyecto.
            <button onClick={onDemo} className="mt-2 w-full bg-amber-500 text-white rounded py-2 font-semibold">
              Entrar en modo demo
            </button>
          </div>
        )}
        {isFirebaseConfigured && (
          <div className="mt-6 space-y-3">
            <button
              onClick={loginGoogle}
              className="w-full bg-white border border-slate-300 rounded-lg py-2.5 font-semibold flex items-center justify-center gap-2 hover:bg-slate-50"
            >
              <span className="text-lg">G</span> Continuar con Google
            </button>
            {err && <p className="text-red-600 text-sm">{err}</p>}
            <p className="text-xs text-slate-400 text-center">
              Solo tú podrás ver tus datos. Activa Google en Firebase → Authentication → Google.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function BalanceInput({ value, onSave, inputClassName }) {
  const fmt = (v) => (v === undefined || v === null || v === '' ? '' : String(v))
  const [draft, setDraft] = useState(fmt(value))
  useEffect(() => setDraft(fmt(value)), [value])
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
        <button onClick={commit} className="text-xs bg-slate-900 text-white px-2 py-1 rounded-lg shrink-0">
          Guardar
        </button>
      )}
    </div>
  )
}

function MovementForm({ onSave, initial }) {
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
      className="bg-white rounded-2xl shadow p-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        const d = new Date(date + 'T12:00:00')
        onSave({
          kind,
          group: currentGroup.group,
          label,
          amount: Number(String(amount).replace(',', '.')) || 0,
          date,
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          note
        })
        setAmount('')
        setNote('')
      }}
    >
      <div className="flex gap-2">
        {['gasto', 'ingreso'].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`flex-1 rounded-lg py-2 font-semibold capitalize ${
              kind === k ? (k === 'gasto' ? 'bg-red-600 text-white' : 'bg-green-600 text-white') : 'bg-slate-100'
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={group} onChange={(e) => { setGroup(e.target.value); setLabel((groups.find(g=>g.group===e.target.value)?.items ?? [])[0] ?? '') }} className="border rounded-lg px-2 py-2">
          {groups.map((g) => (
            <option key={g.group} value={g.group}>{g.group}</option>
          ))}
        </select>
        <select value={label} onChange={(e) => setLabel(e.target.value)} className="border rounded-lg px-2 py-2">
          {currentGroup.items.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input required type="number" step="0.01" min="0" placeholder="Importe €" value={amount} onChange={(e) => setAmount(e.target.value)} className="border rounded-lg px-3 py-2" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded-lg px-3 py-2" />
      </div>
      <input placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} className="border rounded-lg px-3 py-2 w-full" />
      <button className="w-full bg-slate-900 text-white rounded-lg py-2 font-semibold">Guardar {kind}</button>
    </form>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [demo, setDemo] = useState(false)
  const [movements, setMovements] = useState([])
  const [balances, setBalances] = useState({})
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [tab, setTab] = useState('anual') // anual | mes | historico
  const [showForm, setShowForm] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef(null)
  const local = useLocalDemo()

  useEffect(() => {
    if (!isFirebaseConfigured) return
    return onAuthStateChanged(auth, setUser)
  }, [])

  // Load data (firebase)
  useEffect(() => {
    if (!user || !isFirebaseConfigured) return
    const q = query(collection(db, `users/${user.uid}/movements`), orderBy('date', 'desc'))
    const unsub = onSnapshot(q, (s) => setMovements(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
    const q2 = collection(db, `users/${user.uid}/yearSettings`)
    getDocs(q2).then((s) => {
      const b = {}
      s.docs.forEach((d) => (b[d.id] = d.data().initialBalance || 0))
      setBalances(b)
    })
    return unsub
  }, [user])

  const activeMovements = !isFirebaseConfigured || demo ? local.movements : movements
  const activeBalances = !isFirebaseConfigured || demo ? local.balances : balances

  const years = useMemo(() => {
    const s = new Set(activeMovements.map((m) => m.year))
    s.add(new Date().getFullYear())
    s.add(year)
    return [...s].sort()
  }, [activeMovements, year])

  const { incomeByMonth, expenseByMonth, byGroup } = useMemo(
    () => buildYearMatrix(activeMovements, year),
    [activeMovements, year]
  )

  const totalIncome = sum(incomeByMonth)
  const totalExpense = sum(expenseByMonth)
  const net = totalIncome - totalExpense
  const initial = Number(activeBalances[String(year)] || 0)
  const acumulado = useMemo(() => {
    let acc = initial
    return incomeByMonth.map((inc, i) => {
      acc += inc - expenseByMonth[i]
      return acc
    })
  }, [incomeByMonth, expenseByMonth, initial])

  const monthMovs = activeMovements.filter((m) => m.year === year && m.month === month)
  const monthIncome = sum(monthMovs.filter((m) => m.kind === 'ingreso').map((m) => m.amount))
  const monthExpense = sum(monthMovs.filter((m) => m.kind === 'gasto').map((m) => m.amount))

  const history = useMemo(() => {
    return years.map((y) => {
      const { incomeByMonth: ib, expenseByMonth: eb } = buildYearMatrix(activeMovements, y)
      return { year: y, income: sum(ib), expense: sum(eb), net: sum(ib) - sum(eb) }
    })
  }, [activeMovements, years])

  const saveMovement = async (data) => {
    if (!isFirebaseConfigured || demo) {
      local.setMovements([{ id: String(Date.now()), ...data }, ...local.movements])
      setShowForm(false)
      return
    }
    await addDoc(collection(db, `users/${user.uid}/movements`), { ...data, createdAt: new Date().toISOString() })
    setShowForm(false)
  }

  const removeMovement = async (id) => {
    if (!confirm('¿Eliminar este movimiento?')) return
    if (!isFirebaseConfigured || demo) {
      local.setMovements(local.movements.filter((m) => m.id !== id))
      return
    }
    await deleteDoc(doc(db, `users/${user.uid}/movements/${id}`))
  }

  const saveBalance = async (v) => {
    if (!isFirebaseConfigured || demo) {
      local.setBalances({ ...local.balances, [String(year)]: Number(v) || 0 })
      return
    }
    await setDoc(doc(db, `users/${user.uid}/yearSettings/${String(year)}`), { initialBalance: Number(v) || 0 })
    setBalances({ ...balances, [String(year)]: Number(v) || 0 })
  }

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      const parsed = parseExcelFile(buf)
      if (!parsed.movements.length) {
        alert(
          'No se encontró ningún valor con ese formato.\n' +
          (parsed.warnings.join('\n') || 'Revisa que las hojas se llamen por año (2024, 2025…) y tengan la fila Enero…Diciembre.')
        )
        return
      }
      setPreview({ ...parsed, fileName: file.name })
    } catch (err) {
      alert('No se pudo leer el Excel: ' + err.message)
    }
  }

  const confirmImport = async () => {
    if (!preview) return
    setImporting(true)
    try {
      if (!isFirebaseConfigured || demo) {
        const existing = new Set(local.movements.map(keyOf))
        const fresh = preview.movements.filter((m) => !existing.has(keyOf(m))).map((m, i) => ({
          id: `imp-${Date.now()}-${i}`,
          ...m
        }))
        local.setMovements([...fresh, ...local.movements])
        local.setBalances({ ...local.balances, ...preview.balances })
        alert(`Importados ${fresh.length} valores de ${preview.fileName} en modo demo.`)
      } else {
        const snap = await getDocs(collection(db, `users/${user.uid}/movements`))
        const existing = new Set(
          snap.docs.map((d) => {
            const m = d.data()
            return `${m.year}|${m.month}|${m.label}|${m.amount}`
          })
        )
        const fresh = preview.movements.filter((m) => !existing.has(keyOf(m)))
        for (let i = 0; i < fresh.length; i += 400) {
          const batch = writeBatch(db)
          fresh.slice(i, i + 400).forEach((m) => {
            batch.set(doc(collection(db, `users/${user.uid}/movements`)), {
              ...m,
              createdAt: new Date().toISOString()
            })
          })
          await batch.commit()
        }
        for (const [y, v] of Object.entries(preview.balances)) {
          await setDoc(doc(db, `users/${user.uid}/yearSettings/${y}`), { initialBalance: v })
        }
        const b = {}
        const s2 = await getDocs(collection(db, `users/${user.uid}/yearSettings`))
        s2.docs.forEach((d) => (b[d.id] = d.data().initialBalance || 0))
        setBalances(b)
        alert(`Importados ${fresh.length} valores de ${preview.fileName} a Firebase.`)
      }
      setPreview(null)
    } catch (e) {
      alert('Error importando: ' + e.message)
    }
    setImporting(false)
  }

  if (!user && !demo && isFirebaseConfigured) return <Login />
  if (!user && !demo && !isFirebaseConfigured) return <Login onDemo={() => setDemo(true)} />

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-slate-900 text-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <h1 className="font-bold text-lg">Ingresos y Gastos</h1>
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
            <button onClick={() => setYear((y) => y - 1)} className="px-2">‹</button>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-slate-800 font-bold px-2">
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button onClick={() => setYear((y) => y + 1)} className="px-2">›</button>
          </div>
          <nav className="flex gap-1 text-sm">
            {[
              ['anual', 'Anual'],
              ['mes', 'Por mes'],
              ['historico', 'Histórico']
            ].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 rounded-lg ${tab === id ? 'bg-white text-slate-900 font-semibold' : 'bg-slate-800'}`}>
                {label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="opacity-70">{demo ? 'modo demo' : user?.email}</span>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              title="Sube tu Excel (hojas por año) para empezar a usar la web"
              className="bg-green-700 px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50"
            >
              {importing ? 'Importando…' : '📥 Importar Excel'}
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChosen} />
            <button
              onClick={() => (demo ? setDemo(false) : signOut(auth))}
              className="bg-slate-700 px-3 py-1.5 rounded-lg"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-4 space-y-4">
        {/* Bienvenida para quien empieza de cero (sin movimientos) */}
        {activeMovements.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-5 border-2 border-dashed border-slate-300">
            <h2 className="font-bold text-lg">👋 Empieza en 1 minuto</h2>
            <p className="text-sm text-slate-500">Aún no tienes movimientos. Elige cómo empezar:</p>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="font-semibold text-sm">1. Pon tu saldo inicial de {year}</div>
                <p className="text-xs text-slate-500 mb-2">Lo que tienes ahora mismo entre cuentas y efectivo.</p>
                <BalanceInput
                  value={activeBalances[String(year)]}
                  onSave={saveBalance}
                  inputClassName="border rounded-lg px-3 py-2 w-full font-bold"
                />
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="font-semibold text-sm">2. ¿Vienes del Excel?</div>
                <p className="text-xs text-slate-500 mb-2">Sube tu archivo y traemos tus años e historial.</p>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-semibold"
                >
                  📥 Subir mi Excel
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Después pulsa <b>+</b> para meter tu primer gasto o ingreso del mes.
            </p>
          </div>
        )}

        {/* Resumen superior como Excel */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="bg-white rounded-xl p-3 shadow">
            <div className="text-xs text-slate-500">Saldo inicial {year}</div>
            <BalanceInput
              value={activeBalances[String(year)]}
              onSave={saveBalance}
              inputClassName="text-xl font-bold w-full bg-transparent"
            />
          </div>
          <div className="bg-white rounded-xl p-3 shadow">
            <div className="text-xs text-slate-500">Total ingresos</div>
            <div className="text-xl font-bold text-green-700">{eur(totalIncome)}</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow">
            <div className="text-xs text-slate-500">Total gastos</div>
            <div className="text-xl font-bold text-red-700">{eur(totalExpense)}</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow">
            <div className="text-xs text-slate-500">Neto</div>
            <div className={`text-xl font-bold ${net >= 0 ? 'text-green-700' : 'text-red-700'}`}>{eur(net)}</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow">
            <div className="text-xs text-slate-500">Acumulado dic</div>
            <div className="text-xl font-bold">{eur(acumulado[11] ?? initial)}</div>
          </div>
        </div>

        {tab === 'anual' && (
          <>
            <div className="bg-white rounded-xl shadow overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-2"></th>
                    {MONTHS.map((m) => (
                      <th key={m} className="p-2 text-right font-semibold">{m.slice(0, 3)}</th>
                    ))}
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Total Ingresos', incomeByMonth, 'text-green-700 font-bold'],
                    ['Total Gastos', expenseByMonth, 'text-red-700 font-bold'],
                    ['Neto', incomeByMonth.map((v, i) => v - expenseByMonth[i]), 'font-bold'],
                    ['Acumulado', acumulado, 'italic text-slate-500']
                  ].map(([label, arr, cls]) => (
                    <tr key={label} className="border-t">
                      <td className="p-2 font-semibold">{label}</td>
                      {arr.map((v, i) => (
                        <td key={i} className={`p-2 text-right ${cls}`}>{eur(v)}</td>
                      ))}
                      <td className={`p-2 text-right ${cls}`}>{label === 'Acumulado' ? '' : eur(sum(arr.slice(0, label === 'Neto' ? 12 : 12)))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Desglose por grupos como el Excel (fijos + cualquiera que venga de los datos) */}
            {(() => {
              const fixed = [...INCOME_GROUPS, ...EXPENSE_GROUPS]
              const extras = Object.keys(byGroup)
                .filter((g) => !fixed.some((f) => f.group === g))
                .map((g) => ({ group: g, items: Object.keys(byGroup[g]).sort() }))
              return [...fixed, ...extras]
            })().map(({ group, items }) => {
              const rows = items.map((label) => ({ label, months: byGroup[group]?.[label] ?? Array(12).fill(0) }))
              const total = Array(12).fill(0)
              rows.forEach((r) => r.months.forEach((v, i) => (total[i] += v)))
              const isIncome = INCOME_GROUPS.some((g) => g.group === group)
              return (
                <div key={group} className="bg-white rounded-xl shadow overflow-x-auto">
                  <div className="px-3 pt-3 font-bold">{group}</div>
                  <table className="w-full text-sm min-w-[900px]">
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.label} className="border-t">
                          <td className="p-2 w-48">{r.label}</td>
                          {r.months.map((v, i) => (
                            <td key={i} className="p-2 text-right text-slate-600">{v ? eur(v) : ''}</td>
                          ))}
                          <td className="p-2 text-right font-semibold">{eur(sum(r.months))}</td>
                        </tr>
                      ))}
                      <tr className="border-t bg-slate-50 font-bold">
                        <td className="p-2">Total {group}</td>
                        {total.map((v, i) => (
                          <td key={i} className="p-2 text-right">{eur(v)}</td>
                        ))}
                        <td className="p-2 text-right">{eur(sum(total))}</td>
                      </tr>
                      {!isIncome && (
                        <tr className="border-t text-xs text-slate-500">
                          <td className="p-2">% de Ingreso</td>
                          {total.map((v, i) => (
                            <td key={i} className="p-2 text-right">
                              {incomeByMonth[i] ? `${Math.round((v / incomeByMonth[i]) * 100)}%` : '-'}
                            </td>
                          ))}
                          <td className="p-2 text-right">{totalIncome ? `${Math.round((sum(total) / totalIncome) * 100)}%` : '-'}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </>
        )}

        {tab === 'mes' && (
          <div className="space-y-3">
            <div className="flex gap-1 flex-wrap">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => setMonth(i + 1)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${month === i + 1 ? 'bg-slate-900 text-white font-semibold' : 'bg-white shadow'}`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl p-3 shadow text-center">
                <div className="text-xs">Ingresos {MONTHS[month - 1]}</div>
                <div className="font-bold text-green-700 text-lg">{eur(monthIncome)}</div>
              </div>
              <div className="bg-white rounded-xl p-3 shadow text-center">
                <div className="text-xs">Gastos {MONTHS[month - 1]}</div>
                <div className="font-bold text-red-700 text-lg">{eur(monthExpense)}</div>
              </div>
              <div className="bg-white rounded-xl p-3 shadow text-center">
                <div className="text-xs">Neto</div>
                <div className="font-bold text-lg">{eur(monthIncome - monthExpense)}</div>
              </div>
            </div>
            {/* Barra por grupo */}
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-bold mb-2">Gasto por tipo en {MONTHS[month - 1]}</h3>
              {(() => {
                const agg = {}
                monthMovs.filter((m) => m.kind === 'gasto').forEach((m) => {
                  agg[m.label] = (agg[m.label] || 0) + m.amount
                })
                const max = Math.max(1, ...Object.values(agg))
                const entries = Object.entries(agg).sort((a, b) => b[1] - a[1])
                if (!entries.length) return <p className="text-sm text-slate-500">Sin gastos este mes.</p>
                return entries.map(([label, v]) => (
                  <div key={label} className="flex items-center gap-2 text-sm py-1">
                    <div className="w-40 truncate">{label} <span className="text-slate-400">· {groupOf(label)}</span></div>
                    <div className="flex-1 bg-slate-100 rounded h-4 overflow-hidden">
                      <div className="bg-red-500 h-4" style={{ width: `${(v / max) * 100}%` }} />
                    </div>
                    <div className="w-24 text-right font-semibold">{eur(v)}</div>
                  </div>
                ))
              })()}
            </div>
            <div className="bg-white rounded-xl shadow divide-y">
              {monthMovs.length === 0 && <p className="p-4 text-sm text-slate-500">No hay movimientos.</p>}
              {monthMovs.map((m) => (
                <div key={m.id} className="p-3 flex items-center gap-3 text-sm">
                  <span className={`w-2 h-10 rounded ${m.kind === 'ingreso' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div className="flex-1">
                    <div className="font-semibold">{m.label} <span className="font-normal text-slate-400">· {m.group}</span></div>
                    <div className="text-slate-500">{m.date}{m.note ? ` · ${m.note}` : ''}</div>
                  </div>
                  <div className={`font-bold ${m.kind === 'ingreso' ? 'text-green-700' : 'text-red-700'}`}>
                    {m.kind === 'ingreso' ? '+' : '-'}{eur(m.amount)}
                  </div>
                  <button onClick={() => removeMovement(m.id)} className="text-slate-300 hover:text-red-600 px-2">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'historico' && (
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold mb-3">Histórico por años</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="p-2">Año</th>
                  <th className="p-2 text-right">Ingresos</th>
                  <th className="p-2 text-right">Gastos</th>
                  <th className="p-2 text-right">Neto</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const max = Math.max(1, ...history.map((x) => x.expense))
                  return (
                    <tr key={h.year} className="border-t">
                      <td className="p-2">
                        <button onClick={() => { setYear(h.year); setTab('anual') }} className="font-bold underline">{h.year}</button>
                        <div className="h-2 bg-slate-100 rounded mt-1 max-w-[200px]">
                          <div className="h-2 bg-slate-900 rounded" style={{ width: `${(h.expense / max) * 100}%` }} />
                        </div>
                      </td>
                      <td className="p-2 text-right text-green-700">{eur(h.income)}</td>
                      <td className="p-2 text-right text-red-700">{eur(h.expense)}</td>
                      <td className="p-2 text-right font-bold">{eur(h.net)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-2">Pulsa un año para ver su detalle anual.</p>
          </div>
        )}
      </main>

      {/* Botón flotante añadir */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-slate-900 text-white text-3xl shadow-lg"
      >
        +
      </button>
      {showForm && (
        <div className="fixed bottom-24 right-4 left-4 sm:left-auto sm:w-96 z-20">
          <MovementForm onSave={saveMovement} />
        </div>
      )}

      {/* Vista previa de importación del Excel */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-30">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-5 space-y-3 max-h-[85vh] overflow-auto">
            <h2 className="font-bold text-lg">Importar {preview.fileName}</h2>
            <p className="text-sm text-slate-500">
              Se han detectado estos años. Revisa los totales antes de confirmar
              (cada celda se guarda como un movimiento el día 15 de su mes).
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="p-2">Hoja/Año</th>
                  <th className="p-2 text-right">Valores</th>
                  <th className="p-2 text-right">Ingresos</th>
                  <th className="p-2 text-right">Gastos</th>
                  <th className="p-2 text-right">Saldo ini.</th>
                </tr>
              </thead>
              <tbody>
                {preview.sheets.map((s) => (
                  <tr key={s.year} className="border-t">
                    <td className="p-2 font-bold">{s.year}</td>
                    <td className="p-2 text-right">{s.count}</td>
                    <td className="p-2 text-right text-green-700">{eur(s.income)}</td>
                    <td className="p-2 text-right text-red-700">{eur(s.expense)}</td>
                    <td className="p-2 text-right">{eur(s.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded p-2">
                {preview.warnings.map((w, i) => (
                  <p key={i}>⚠ {w}</p>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setPreview(null)} className="flex-1 border rounded-lg py-2 font-semibold">
                Cancelar
              </button>
              <button
                onClick={confirmImport}
                disabled={importing}
                className="flex-1 bg-green-700 text-white rounded-lg py-2 font-semibold disabled:opacity-50"
              >
                {importing ? 'Importando…' : `Confirmar (${preview.movements.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
