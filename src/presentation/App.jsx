import { useEffect, useMemo, useRef, useState } from 'react'
import { isFirebaseConfigured } from '../firebase.js'
import { buildYearMatrix, sum } from '../domain/ledger.js'
import { eur, parseSharedAmount } from '../domain/money.js'
import { toISODate } from '../domain/dates.js'
import { saveMovement, removeMovement } from '../application/movements.js'
import { saveBalance } from '../application/balances.js'
import { importPreview, previewWorkbook } from '../application/workbookImport.js'
import { readWorkbookSheets } from '../infrastructure/excelReader.js'
import { signOutUser, watchSession } from '../infrastructure/auth.js'
import { useLedger } from './hooks/useLedger.js'
import { EyeIcon, EyeOffIcon } from './components/icons.jsx'
import { Login } from './components/Login.jsx'
import { MovementForm } from './components/MovementForm.jsx'
import { InstallButton } from './components/InstallButton.jsx'
import { ImportPreviewDialog } from './components/ImportPreviewDialog.jsx'
import { WelcomeCard } from './components/WelcomeCard.jsx'
import { YearSummary } from './components/YearSummary.jsx'
import { AnnualView } from './components/AnnualView.jsx'
import { MonthView } from './components/MonthView.jsx'
import { CategoryView } from './components/CategoryView.jsx'
import { HistoryView } from './components/HistoryView.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [demo, setDemo] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [tab, setTab] = useState('mes') // mes | anual | categorias | historico
  const [showForm, setShowForm] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState(null)
  const [prefill, setPrefill] = useState(null)
  const [installHelp, setInstallHelp] = useState(false)
  const [privateMode, setPrivateMode] = useState(() => {
    try {
      return localStorage.getItem('ledger-private-mode') === '1'
    } catch {
      return false
    }
  })
  const fileRef = useRef(null)

  useEffect(() => {
    if (!isFirebaseConfigured) return
    return watchSession(setUser)
  }, [])

  const { store, movements: activeMovements, balances: activeBalances, refreshBalances } = useLedger(user, demo)

  const togglePrivate = () => {
    setPrivateMode((v) => {
      try {
        localStorage.setItem('ledger-private-mode', v ? '0' : '1')
      } catch {}
      return !v
    })
  }
  const fmt = (n) => (privateMode ? '****' : eur(n))

  const goCurrentMonth = () => {
    const n = new Date()
    setYear(n.getFullYear())
    setMonth(n.getMonth() + 1)
  }

  // Captura rápida: ?amount=12,50&kind=gasto&note=..&date=...., ?nuevo=1
  // o texto compartido desde otra app (?text=..&title=..&url=..).
  // Solo rellena el formulario; nada se guarda sin pulsar Guardar.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const shared = [q.get('title'), q.get('text'), q.get('url')].filter(Boolean).join('\n')
    const wantsNew = q.has('nuevo') || q.has('amount') || shared !== ''
    if (!wantsNew) return
    const fromParam = parseSharedAmount(q.get('amount') ?? '')
    const amount = fromParam || parseSharedAmount(shared)
    const note = (q.get('note') ?? q.get('text') ?? q.get('title') ?? '').slice(0, 120)
    const dateParam = q.get('date') ?? ''
    setPrefill({
      kind: q.get('kind') === 'ingreso' ? 'ingreso' : 'gasto',
      amount: amount || '',
      date: /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : toISODate(),
      note
    })
    setShowForm(true)
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

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

  const handleSave = async (formValues) => {
    if (!store) return
    await saveMovement(store, formValues)
    setShowForm(false)
    setPrefill(null)
  }

  const handleRemove = async (id) => {
    if (!confirm('¿Eliminar este movimiento?')) return
    if (!store) return
    await removeMovement(store, id)
  }

  const handleSaveBalance = async (v) => {
    if (!store) return
    await saveBalance(store, year, v)
    await refreshBalances()
  }

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      const parsed = previewWorkbook(readWorkbookSheets, buf)
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
    if (!preview || !store) return
    setImporting(true)
    try {
      const { imported } = await importPreview(store, preview)
      await refreshBalances()
      alert(
        `Importados ${imported} valores de ${preview.fileName}` +
        (!isFirebaseConfigured || demo ? ' en modo demo.' : ' a Firebase.')
      )
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
      <header className="sticky top-0 z-40 bg-papel/95 backdrop-blur border-b-[3px] border-double border-tinta/40">
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
          <div className="ml-auto flex items-center gap-2 text-sm w-full sm:w-auto justify-start border-t border-tinta/15 pt-2 sm:border-t-0 sm:pt-0">
            <span className="text-tinta/55 hidden md:inline">{demo ? 'modo demo' : user?.email}</span>
            <button
              onClick={togglePrivate}
              aria-pressed={privateMode}
              aria-label={privateMode ? 'Mostrar importes' : 'Ocultar importes'}
              title={privateMode ? 'Mostrar importes' : 'Ocultar importes'}
              className="border border-tinta/25 px-2.5 py-1.5 hover:border-boli hover:text-boli"
            >
              {privateMode ? <EyeOffIcon /> : <EyeIcon />}
            </button>
            <InstallButton help={installHelp} setHelp={setInstallHelp} />
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
              onClick={() => (demo ? setDemo(false) : signOutUser())}
              className="text-tinta/60 px-2 py-1.5 underline decoration-tinta/30 underline-offset-4 hover:text-rojo"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:pl-8 mt-6 space-y-8 ledger-margin sm:ml-4">
        {activeMovements.length === 0 && (
          <WelcomeCard
            year={year}
            balanceValue={activeBalances[String(year)]}
            onSaveBalance={handleSaveBalance}
            masked={privateMode}
            onPickFile={() => fileRef.current?.click()}
          />
        )}

        <YearSummary
          year={year}
          balanceValue={activeBalances[String(year)]}
          onSaveBalance={handleSaveBalance}
          masked={privateMode}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          net={net}
          acumuladoDic={acumulado[11] ?? initial}
          fmt={fmt}
        />

        {tab === 'anual' && (
          <AnnualView
            incomeByMonth={incomeByMonth}
            expenseByMonth={expenseByMonth}
            acumulado={acumulado}
            byGroup={byGroup}
            totalIncome={totalIncome}
            month={month}
            fmt={fmt}
          />
        )}

        {tab === 'mes' && (
          <MonthView
            year={year}
            month={month}
            onMonth={setMonth}
            onCurrentMonth={goCurrentMonth}
            monthMovs={monthMovs}
            monthIncome={monthIncome}
            monthExpense={monthExpense}
            onRemove={handleRemove}
            fmt={fmt}
          />
        )}

        {tab === 'categorias' && (
          <CategoryView
            movements={activeMovements}
            year={year}
            month={month}
            onMonth={setMonth}
            onCurrentMonth={goCurrentMonth}
            fmt={fmt}
          />
        )}

        {tab === 'historico' && (
          <HistoryView
            movements={activeMovements}
            years={years}
            onOpenYear={(y) => { setYear(y); setTab('anual') }}
            fmt={fmt}
          />
        )}
      </main>

      {/* Sello para anotar (se oculta con diálogos abiertos) */}
      {!preview && !installHelp && (
      <button
        onClick={() => {
          if (showForm) setPrefill(null)
          setShowForm(!showForm)
        }}
        aria-expanded={showForm}
        className="stamp fixed bottom-6 right-6 z-40 bg-boli text-white font-semibold pl-4 pr-5 py-3 -rotate-2 hover:rotate-0 active:scale-95 transition shadow-[3px_3px_0_0_rgba(29,42,77,0.25)]"
      >
        <span aria-hidden="true" className="font-slab font-bold text-xl leading-none mr-2">+</span>
        Añadir movimiento
      </button>
      )}
      {showForm && (
        <div className="fixed bottom-24 right-4 left-4 sm:left-auto sm:w-[26rem] z-40 max-h-[70vh] overflow-auto">
          <MovementForm onSave={handleSave} initial={prefill ?? undefined} />
        </div>
      )}

      <ImportPreviewDialog
        preview={preview}
        importing={importing}
        onCancel={() => setPreview(null)}
        onConfirm={confirmImport}
        fmt={fmt}
      />
    </div>
  )
}
