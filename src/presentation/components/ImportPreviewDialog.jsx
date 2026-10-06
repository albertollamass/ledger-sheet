export function ImportPreviewDialog({ preview, importing, onCancel, onConfirm, fmt }) {
  if (!preview) return null
  return (
    <div className="fixed top-0 left-0 w-full z-50 overflow-y-auto bg-tinta/50" style={{ height: '100dvh' }}>
      <div className="min-h-full flex items-center justify-center p-4">
      <div className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.25)] w-full max-w-lg max-h-[85vh] overflow-auto my-auto">
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
                <td className="p-2 text-right text-haber">{fmt(s.income)}</td>
                <td className="p-2 text-right text-rojo">{fmt(s.expense)}</td>
                <td className="p-2 text-right">{fmt(s.balance)}</td>
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
          <button onClick={onCancel} className="flex-1 border border-tinta/30 py-2 font-semibold hover:border-tinta">
            Atrás
          </button>
          <button
            onClick={onConfirm}
            disabled={importing}
            className="flex-1 bg-tinta text-white py-2 font-semibold hover:bg-boli active:scale-[0.98] transition disabled:opacity-50"
          >
            {importing ? 'Importando…' : `Importar ${preview.movements.length} movimientos`}
          </button>
        </div>
        </div>
      </div>
      </div>
    </div>
  )
}
