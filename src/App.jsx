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
      <div className="bg-white w-full max-w-md px-8 py-10 ledger-margin shadow-[4px_4px_0_0_rgba(29,42,77,0.12)]">
        <p className="font-slab text-lg text-rojo">cuaderno de cuentas</p>
        <h1 className="font-slab font-bold text-4xl leading-tight mt-1">Ingresos y gastos</h1>
        <p className="text-sm text-tinta/60 mt-2">
          Apunta cada gasto, mira el mes de un vistazo y guarda el historial por años.
        </p>
        <hr className="border-t border-tinta/15 mt-5" />
        {!isFirebaseConfigured && (
          <div className="mt-5 bg-amber-50 border border-amber-300 text-amber-900 text-sm p-3">
            Firebase no configurado. Puedes probar en <b>modo demo local</b> o seguir la guía{' '}
            <code>FIREBASE_SETUP.md</code> para conectar tu proyecto.
            <button onClick={onDemo} className="mt-2 w-full bg-amber-500 text-white py-2 font-semibold">
              Entrar en modo demo
            </button>
          </div>
        )}
        {isFirebaseConfigured && (
          <div className="mt-6 space-y-3">
            <button
              onClick={loginGoogle}
              className="stamp w-full text-boli py-2.5 font-semibold flex items-center justify-center gap-2 hover:bg-boli hover:text-white active:scale-[0.98] transition"
            >
              <span className="font-slab font-bold text-lg leading-none">G</span> Continuar con Google
            </button>
            {err && <p className="text-rojo text-sm">{err}</p>}
            <p className="text-xs text-tinta/50 text-center">
              Solo tú verás tus datos. Activa Google en Firebase, Authentication, Google.
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
        <button onClick={commit} className="text-xs bg-tinta text-white px-2 py-1 shrink-0 hover:bg-boli active:scale-95 transition">
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
      className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)]"
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

export default function App() {
  const [user, setUser] = useState(null)
  const [demo, setDemo] = useState(false)
  const [movements, setMovements] = useState([])
  const [balances, setBalances] = useState({})
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [tab, setTab] = useState('mes') // mes | anual | categorias | historico
  const [catGroup, setCatGroup] = useState(null)
  const [catScope, setCatScope] = useState('mes') // mes | año
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

  // Categorías: grupos fijos + los que vengan de los datos
  const availableGroups = useMemo(() => {
    const fixed = [...INCOME_GROUPS, ...EXPENSE_GROUPS].map((g) => g.group)
    const extras = [...new Set(activeMovements.map((m) => m.group))].filter((g) => g && !fixed.includes(g))
    return [...fixed, ...extras]
  }, [activeMovements])

  // Por defecto, la categoría con más gasto del año
  useEffect(() => {
    if (catGroup || !availableGroups.length) return
    const tot = {}
    activeMovements
      .filter((m) => m.year === year && m.kind === 'gasto')
      .forEach((m) => {
        tot[m.group] = (tot[m.group] || 0) + m.amount
      })
    const top = Object.entries(tot).sort((a, b) => b[1] - a[1])[0]?.[0]
    setCatGroup(top ?? availableGroups[0])
  }, [activeMovements, year, catGroup, availableGroups])

  const catData = useMemo(() => {
    if (!catGroup) return null
    const kind = catGroup === 'Ingresos' ? 'ingreso' : 'gasto'
    const inScope = activeMovements.filter(
      (m) => m.year === year && (catScope === 'año' || m.month === month) && m.group === catGroup
    )
    const scopeAll = activeMovements.filter(
      (m) => m.year === year && (catScope === 'año' || m.month === month) && m.kind === kind
    )
    const total = sum(inScope.map((m) => m.amount))
    const scopeTotal = sum(scopeAll.map((m) => m.amount))
    const byLabel = {}
    inScope.forEach((m) => {
      byLabel[m.label] = byLabel[m.label] || { amount: 0, count: 0 }
      byLabel[m.label].amount += m.amount
      byLabel[m.label].count += 1
    })
    const rows = Object.entries(byLabel)
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.amount - a.amount)
    const now = new Date()
    const elapsed =
      year < now.getFullYear() ? 12 : year > now.getFullYear() ? 1 : now.getMonth() + 1
    return { kind, total, scopeTotal, rows, count: inScope.length, avg: total / elapsed }
  }, [activeMovements, year, month, catGroup, catScope])

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
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-10 bg-papel/95 backdrop-blur border-b-[3px] border-double border-tinta/40">
        <div className="max-w-6xl mx-auto px-4 sm:pl-8 py-3 flex items-center gap-3 flex-wrap">
          <div className="leading-none">
            <p className="font-slab text-rojo text-sm">cuaderno de cuentas</p>
            <h1 className="font-slab font-bold text-xl">Ingresos y gastos</h1>
          </div>
          <div className="flex items-center gap-1 border border-tinta/25 bg-white px-1">
            <button onClick={() => setYear((y) => y - 1)} className="px-2 py-1 hover:text-boli" aria-label="Año anterior">‹</button>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="figures font-slab font-semibold text-lg bg-transparent py-1" aria-label="Año">
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button onClick={() => setYear((y) => y + 1)} className="px-2 py-1 hover:text-boli" aria-label="Año siguiente">›</button>
          </div>
          <nav className="flex text-sm border border-tinta/25 bg-white" aria-label="Vistas">
            {[
              ['mes', 'Mes'],
              ['anual', 'Año'],
              ['categorias', 'Categorías'],
              ['historico', 'Historial']
            ].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined} className={`px-4 py-2 font-medium border-r last:border-r-0 border-tinta/15 ${tab === id ? 'bg-tinta text-white font-semibold' : 'hover:bg-papel'}`}>
                {label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-tinta/55 hidden md:inline">{demo ? 'modo demo' : user?.email}</span>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              title="Sube tu Excel (hojas por año) para empezar a usar la web"
              className="border border-haber text-haber px-3 py-1.5 font-semibold hover:bg-haber hover:text-white active:scale-95 transition disabled:opacity-50"
            >
              {importing ? 'Importando…' : 'Importar Excel'}
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChosen} />
            <button
              onClick={() => (demo ? setDemo(false) : signOut(auth))}
              className="text-tinta/60 px-2 py-1.5 underline decoration-tinta/30 underline-offset-4 hover:text-rojo"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:pl-8 mt-6 space-y-8 ledger-margin sm:ml-4">
        {/* Bienvenida para quien empieza de cero (sin movimientos) */}
        {activeMovements.length === 0 && (
          <section className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)] p-5 sm:p-6">
            <p className="font-slab text-rojo">primera página</p>
            <h2 className="font-slab font-bold text-2xl mt-1">Empieza en un minuto</h2>
            <p className="text-sm text-tinta/60 mt-1">Aún no hay movimientos. Elige cómo estrenar el cuaderno:</p>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="border-t-2 border-tinta/70 pt-3">
                <p className="font-semibold text-sm">1. Anota tu saldo inicial de {year}</p>
                <p className="text-xs text-tinta/55 mb-2">Lo que tienes ahora entre cuentas y efectivo.</p>
                <BalanceInput
                  value={activeBalances[String(year)]}
                  onSave={saveBalance}
                  inputClassName="figures border-b border-tinta/30 focus:border-boli focus:border-b-2 py-1.5 w-full font-slab font-semibold text-lg"
                />
              </div>
              <div className="border-t-2 border-tinta/70 pt-3">
                <p className="font-semibold text-sm">2. Trae tu Excel</p>
                <p className="text-xs text-tinta/55 mb-2">Sube el archivo y copiamos tus años e historial.</p>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="border border-haber text-haber px-4 py-2 text-sm font-semibold hover:bg-haber hover:text-white active:scale-95 transition"
                >
                  Subir mi Excel
                </button>
              </div>
            </div>
            <p className="text-xs text-tinta/50 mt-4">
              Después pulsa Añadir movimiento para meter el primer gasto o ingreso del mes.
            </p>
          </section>
        )}

        {/* Cabecera del año, como el encabezado del Excel */}
        <section aria-label={`Resumen de ${year}`} className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)]">
          <dl className="grid grid-cols-2 md:grid-cols-5 divide-x divide-tinta/10">
            <div className="p-4">
              <dt className="text-xs text-tinta/55">Saldo inicial {year}</dt>
              <dd className="mt-1">
                <BalanceInput
                  value={activeBalances[String(year)]}
                  onSave={saveBalance}
                  inputClassName="figures text-xl font-slab font-semibold w-full bg-transparent"
                />
              </dd>
            </div>
            <div className="p-4">
              <dt className="text-xs text-tinta/55">Ingresos del año</dt>
              <dd className="figures mt-1 text-xl font-slab font-semibold text-haber">{eur(totalIncome)}</dd>
            </div>
            <div className="p-4">
              <dt className="text-xs text-tinta/55">Gastos del año</dt>
              <dd className="figures mt-1 text-xl font-slab font-semibold text-rojo">{eur(totalExpense)}</dd>
            </div>
            <div className="p-4">
              <dt className="text-xs text-tinta/55">Neto</dt>
              <dd className={`figures mt-1 text-xl font-slab font-semibold ${net >= 0 ? 'text-haber' : 'text-rojo'}`}>{eur(net)}</dd>
            </div>
            <div className="p-4 col-span-2 md:col-span-1">
              <dt className="text-xs text-tinta/55">Acumulado a diciembre</dt>
              <dd className="figures mt-1 text-xl font-slab font-semibold">{eur(acumulado[11] ?? initial)}</dd>
            </div>
          </dl>
        </section>

        {tab === 'anual' && (
          <>
            <section className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)] overflow-x-auto" aria-label={`Meses de ${year}`}>
              <table className="figures w-full text-sm min-w-[900px] border-collapse">
                <thead className="sticky top-0">
                  <tr className="bg-papel border-b-2 border-tinta/60">
                    <th className="text-left p-2.5 font-medium text-tinta/60"></th>
                    {MONTHS.map((m) => (
                      <th key={m} className="p-2.5 text-right font-medium text-tinta/60">{m.slice(0, 3)}</th>
                    ))}
                    <th className="p-2.5 text-right font-medium text-tinta/60">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Ingresos', incomeByMonth, 'text-haber font-semibold'],
                    ['Gastos', expenseByMonth, 'text-rojo font-semibold'],
                    ['Neto', incomeByMonth.map((v, i) => v - expenseByMonth[i]), 'font-semibold'],
                    ['Acumulado', acumulado, 'italic text-tinta/50']
                  ].map(([label, arr, cls]) => (
                    <tr key={label} className="border-b border-tinta/10 hover:bg-boli/[0.04]">
                      <td className="p-2.5 font-slab font-semibold">{label}</td>
                      {arr.map((v, i) => (
                        <td key={i} className={`p-2.5 text-right ${cls}`}>{eur(v)}</td>
                      ))}
                      <td className={`p-2.5 text-right ${cls}`}>{label === 'Acumulado' ? '' : eur(sum(arr))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

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
                <section key={group} className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)] overflow-x-auto" aria-label={group}>
                  <h3 className="font-slab font-semibold text-lg px-4 pt-4 pb-2 border-b-2 border-tinta/60">{group}</h3>
                  <table className="figures w-full text-sm min-w-[900px] border-collapse">
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.label} className="border-b border-tinta/10 hover:bg-boli/[0.04]">
                          <td className="p-2.5 w-52">{r.label}</td>
                          {r.months.map((v, i) => (
                            <td key={i} className="p-2.5 text-right text-tinta/60">{v ? eur(v) : ''}</td>
                          ))}
                          <td className="p-2.5 text-right font-semibold">{eur(sum(r.months))}</td>
                        </tr>
                      ))}
                      <tr className="border-b-2 border-tinta/60 font-semibold bg-papel/60">
                        <td className="p-2.5 font-slab">Total {group}</td>
                        {total.map((v, i) => (
                          <td key={i} className="p-2.5 text-right">{eur(v)}</td>
                        ))}
                        <td className="p-2.5 text-right">{eur(sum(total))}</td>
                      </tr>
                      {!isIncome && (
                        <tr className="text-xs text-tinta/50">
                          <td className="p-2.5">Tanto del ingreso</td>
                          {total.map((v, i) => (
                            <td key={i} className="p-2.5 text-right">
                              {incomeByMonth[i] ? `${Math.round((v / incomeByMonth[i]) * 100)} %` : '—'}
                            </td>
                          ))}
                          <td className="p-2.5 text-right">{totalIncome ? `${Math.round((sum(total) / totalIncome) * 100)} %` : '—'}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </section>
              )
            })}
          </>
        )}

        {tab === 'mes' && (
          <div className="space-y-6">
            <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Mes">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => setMonth(i + 1)}
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
            </div>

            {/* Lo característico: el gasto del mes, grande, en rojo contable */}
            <section aria-label={`${MONTHS[month - 1]} de ${year}`} className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)] p-5 sm:p-8 flex flex-wrap items-end gap-x-10 gap-y-6">
              <div>
                <p className="font-slab text-rojo text-lg">Gastado en {MONTHS[month - 1].toLowerCase()}</p>
                <p className="figures font-slab font-bold text-rojo leading-none text-6xl sm:text-7xl mt-1">
                  {eur(monthExpense)}
                </p>
                <p className="text-sm text-tinta/55 mt-2">
                  Ingresado <span className="figures font-semibold text-haber">{eur(monthIncome)}</span>
                </p>
              </div>
              <div
                className={`stamp figures ml-auto w-32 h-32 sm:w-36 sm:h-36 -rotate-6 flex flex-col items-center justify-center text-center leading-tight ${
                  monthIncome - monthExpense >= 0 ? 'text-haber' : 'text-rojo'
                }`}
                aria-label={`Neto del mes: ${eur(monthIncome - monthExpense)}`}
              >
                <span className="text-[11px] font-medium">neto</span>
                <span className="font-slab font-bold text-xl sm:text-2xl px-2">{eur(monthIncome - monthExpense)}</span>
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
                      <p className="text-xs text-tinta/50">{groupOf(label)}</p>
                    </div>
                    <div className="flex-1 h-3 bg-papel border border-tinta/15 overflow-hidden">
                      <div className="bg-rojo/80 h-full" style={{ width: `${(v / max) * 100}%` }} />
                    </div>
                    <div className="figures w-28 text-right font-slab font-semibold">{eur(v)}</div>
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
                    {m.kind === 'ingreso' ? '+' : '−'}{eur(m.amount)}
                  </p>
                  <button onClick={() => removeMovement(m.id)} aria-label={`Borrar ${m.label}`} className="text-tinta/25 hover:text-rojo px-2 text-base">✕</button>
                </div>
              ))}
            </section>
          </div>
        )}

        {tab === 'categorias' && (
          <div className="space-y-6">
            <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Elige categoría">
              {availableGroups.map((g) => (
                <button
                  key={g}
                  onClick={() => setCatGroup(g)}
                  aria-pressed={catGroup === g}
                  className={`px-3 py-1.5 text-sm border ${
                    catGroup === g
                      ? 'bg-tinta text-white border-tinta font-semibold'
                      : 'bg-white border-tinta/25 hover:border-boli hover:text-boli'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            {catData && (
              <section
                className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)] p-5 sm:p-6"
                aria-label={`Desglose de ${catGroup}`}
              >
                <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
                  <div>
                    <p className="font-slab text-lg text-tinta/60">{catGroup}</p>
                    <p
                      className={`figures font-slab font-bold leading-none text-5xl sm:text-6xl mt-1 ${
                        catData.kind === 'ingreso' ? 'text-haber' : 'text-rojo'
                      }`}
                    >
                      {eur(catData.total)}
                    </p>
                  </div>
                  <div
                    className="flex text-sm border border-tinta/25 bg-white self-start"
                    role="group"
                    aria-label="Periodo"
                  >
                    {[
                      ['mes', MONTHS[month - 1].slice(0, 3)],
                      ['año', String(year)]
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => setCatScope(id)}
                        aria-pressed={catScope === id}
                        className={`px-4 py-1.5 border-r last:border-r-0 border-tinta/15 ${
                          catScope === id ? 'bg-tinta text-white font-semibold' : 'hover:bg-papel'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-tinta/55 mt-2">
                  {catData.count} {catData.count === 1 ? 'movimiento' : 'movimientos'}
                  {catScope === 'año' && (
                    <> · media de {eur(catData.avg)} al mes</>
                  )}
                  {catData.scopeTotal > 0 && (
                    <> · supone el {Math.round((catData.total / catData.scopeTotal) * 100)} % de lo {catData.kind === 'ingreso' ? 'ingresado' : 'gastado'} en el periodo</>
                  )}
                </p>

                <div className="mt-4 border-t-2 border-tinta/60">
                  {catData.rows.length === 0 && (
                    <p className="text-sm text-tinta/55 py-4">
                      Nada en {catGroup} {catScope === 'mes' ? `en ${MONTHS[month - 1].toLowerCase()}` : `en ${year}`}.
                    </p>
                  )}
                  {catData.rows.map((r) => (
                    <div
                      key={r.label}
                      className="flex items-center gap-3 text-sm py-2.5 border-b border-tinta/10 last:border-b-0"
                    >
                      <div className="w-44 shrink-0">
                        <p className="truncate font-medium">{r.label}</p>
                        <p className="text-xs text-tinta/50">
                          {r.count} {r.count === 1 ? 'movimiento' : 'movimientos'}
                        </p>
                      </div>
                      <div className="flex-1 h-3 bg-papel border border-tinta/15 overflow-hidden">
                        <div
                          className={`h-full ${catData.kind === 'ingreso' ? 'bg-haber/80' : 'bg-rojo/80'}`}
                          style={{ width: `${catData.total ? (r.amount / catData.total) * 100 : 0}%` }}
                        />
                      </div>
                      <p className="figures w-28 text-right font-slab font-semibold">{eur(r.amount)}</p>
                      <p className="figures w-12 text-right text-xs text-tinta/50">
                        {catData.total ? `${Math.round((r.amount / catData.total) * 100)} %` : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {tab === 'historico' && (
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
                        <button onClick={() => { setYear(h.year); setTab('anual') }} className="font-slab font-semibold text-lg underline decoration-boli/40 underline-offset-4 hover:text-boli">{h.year}</button>
                        <div className="h-1.5 bg-papel border border-tinta/15 mt-1.5 max-w-[220px]" aria-hidden="true">
                          <div className="h-full bg-tinta/70" style={{ width: `${(h.expense / max) * 100}%` }} />
                        </div>
                      </td>
                      <td className="p-2.5 text-right text-haber">{eur(h.income)}</td>
                      <td className="p-2.5 text-right text-rojo">{eur(h.expense)}</td>
                      <td className="p-2.5 text-right font-slab font-semibold">{eur(h.net)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="text-xs text-tinta/50 mt-3">Toca un año para abrir su página.</p>
          </section>
        )}
      </main>

      {/* Sello para anotar */}
      <button
        onClick={() => setShowForm(!showForm)}
        aria-expanded={showForm}
        className="stamp fixed bottom-6 right-6 z-20 bg-boli text-white font-semibold pl-4 pr-5 py-3 -rotate-2 hover:rotate-0 active:scale-95 transition shadow-[3px_3px_0_0_rgba(29,42,77,0.25)]"
      >
        <span aria-hidden="true" className="font-slab font-bold text-xl leading-none mr-2">+</span>
        Añadir movimiento
      </button>
      {showForm && (
        <div className="fixed bottom-24 right-4 left-4 sm:left-auto sm:w-[26rem] z-20 max-h-[70vh] overflow-auto">
          <MovementForm onSave={saveMovement} />
        </div>
      )}

      {/* Vista previa de importación del Excel */}
      {preview && (
        <div className="fixed inset-0 bg-tinta/50 flex items-center justify-center p-4 z-30">
          <div className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.25)] w-full max-w-lg max-h-[85vh] overflow-auto">
            <div className="border-b-[3px] border-double border-tinta/30 px-5 pt-4 pb-3">
              <h2 className="font-slab font-semibold text-xl">Importar {preview.fileName}</h2>
              <p className="text-sm text-tinta/60 mt-1">
                Revisa los totales antes de pasarlo al cuaderno. Cada celda entra como un movimiento el día 15 de su mes.
              </p>
            </div>
            <div className="p-5 space-y-3">
            <table className="figures w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-tinta/55 border-b border-tinta/15">
                  <th className="py-2 pr-2 font-medium">Página</th>
                  <th className="p-2 text-right font-medium">Movimientos</th>
                  <th className="p-2 text-right font-medium">Ingresos</th>
                  <th className="p-2 text-right font-medium">Gastos</th>
                  <th className="p-2 text-right font-medium">Saldo ini.</th>
                </tr>
              </thead>
              <tbody>
                {preview.sheets.map((s) => (
                  <tr key={s.year} className="border-b border-tinta/10 last:border-b-0">
                    <td className="py-2 pr-2 font-slab font-semibold">{s.year}</td>
                    <td className="p-2 text-right">{s.count}</td>
                    <td className="p-2 text-right text-haber">{eur(s.income)}</td>
                    <td className="p-2 text-right text-rojo">{eur(s.expense)}</td>
                    <td className="p-2 text-right">{eur(s.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 text-xs p-2">
                {preview.warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setPreview(null)} className="flex-1 border border-tinta/30 py-2 font-semibold hover:border-tinta">
                Atrás
              </button>
              <button
                onClick={confirmImport}
                disabled={importing}
                className="flex-1 bg-tinta text-white py-2 font-semibold hover:bg-boli active:scale-[0.98] transition disabled:opacity-50"
              >
                {importing ? 'Importando…' : `Importar ${preview.movements.length} movimientos`}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
