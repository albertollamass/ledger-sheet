import { BalanceInput } from './BalanceInput.jsx'

export function WelcomeCard({ year, balanceValue, onSaveBalance, masked, onPickFile }) {
  return (
    <section className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.12)] p-5 sm:p-6">
      <p className="font-slab text-rojo">primera página</p>
      <h2 className="font-slab font-bold text-2xl mt-1">Empieza en un minuto</h2>
      <p className="text-sm text-tinta/60 mt-1">Aún no hay movimientos. Elige cómo estrenar el cuaderno:</p>
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <div className="border-t-2 border-tinta/70 pt-3">
          <p className="font-semibold text-sm">1. Anota tu saldo inicial de {year}</p>
          <p className="text-xs text-tinta/55 mb-2">Lo que tienes ahora entre cuentas y efectivo.</p>
          <BalanceInput
            value={balanceValue}
            onSave={onSaveBalance}
            masked={masked}
            inputClassName="figures border-b border-tinta/30 focus:border-boli focus:border-b-2 py-1.5 w-full font-slab font-semibold text-lg"
          />
        </div>
        <div className="border-t-2 border-tinta/70 pt-3">
          <p className="font-semibold text-sm">2. Trae tu Excel</p>
          <p className="text-xs text-tinta/55 mb-2">Sube el archivo y copiamos tus años e historial.</p>
          <button
            onClick={onPickFile}
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
  )
}
