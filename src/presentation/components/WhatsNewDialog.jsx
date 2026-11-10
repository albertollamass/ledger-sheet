export function WhatsNewDialog({ release, onClose }) {
  if (!release) return null
  return (
    <div
      className="fixed inset-0 z-[60] bg-tinta/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
    >
      <div className="bg-white shadow-[4px_4px_0_0_rgba(29,42,77,0.25)] w-full max-w-lg max-h-[85vh] overflow-auto">
        <div className="border-b-[3px] border-double border-tinta/30 px-5 pt-4 pb-3 flex items-start gap-3">
          <div className="flex-1">
            <p className="font-slab text-rojo text-sm">novedades · versión {release.version}</p>
            <h2 id="whats-new-title" className="font-slab font-bold text-2xl leading-tight mt-0.5">
              {release.title}
            </h2>
            <p className="text-xs text-tinta/50 mt-1">{release.date}</p>
          </div>
          <span aria-hidden="true" className="stamp text-boli text-xs px-2 py-1 -rotate-3 shrink-0">
            nuevo
          </span>
        </div>

        <ul className="p-5 space-y-4">
          {release.items.map((item) => (
            <li key={item.title} className="flex gap-3">
              <span
                aria-hidden="true"
                className="shrink-0 w-8 h-8 border border-boli/40 text-boli flex items-center justify-center font-slab font-bold"
              >
                {item.icon}
              </span>
              <div>
                <p className="font-slab font-semibold">{item.title}</p>
                <p className="text-sm text-tinta/65 mt-0.5">{item.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="px-5 pb-5">
          <button
            autoFocus
            onClick={onClose}
            className="stamp w-full text-boli py-2.5 font-semibold hover:bg-boli hover:text-white active:scale-[0.98] transition"
          >
            Entendido
          </button>
          <p className="text-[11px] text-tinta/45 text-center mt-2">
            Solo se muestra una vez por versión y cuenta.
          </p>
        </div>
      </div>
    </div>
  )
}
