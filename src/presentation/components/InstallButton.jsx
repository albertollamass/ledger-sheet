import { useEffect, useState } from 'react'

export function InstallButton({ help, setHelp }) {
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(
    () =>
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
  )

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  return (
    <>
      <button
        onClick={async () => {
          if (deferred) {
            deferred.prompt()
            await deferred.userChoice.catch(() => {})
            setDeferred(null)
          } else {
            setHelp(true)
          }
        }}
        title="Pon la app en tu pantalla de inicio"
        className="border border-boli text-boli px-3 py-1.5 font-semibold hover:bg-boli hover:text-white active:scale-95 transition"
      >
        Instalar app
      </button>
      {help && (
        <div className="fixed top-0 left-0 w-full z-50 overflow-y-auto bg-tinta/70" style={{ height: '100dvh' }}>
          <div className="min-h-full flex items-center justify-center p-4">
          <div className="bg-white shadow-[4px_4px_0_0_rgba(0,0,0,0.35)] w-full max-w-md text-center my-auto">
            <div className="border-b-[3px] border-double border-tinta/30 px-5 pt-5 pb-4">
              <p className="font-slab text-rojo">llévalo contigo</p>
              <h2 className="font-slab font-bold text-2xl mt-1">Instalar la app</h2>
              <p className="text-sm text-tinta/60 mt-2">
                El navegador no deja poner el icono solo: se instala desde su menú. Instalada tendrás
                el atajo con pulsación larga y podrás compartirle gastos desde el banco.
              </p>
            </div>
            <div className="p-5 space-y-0 text-sm text-left">
              <div className="flex gap-3 py-3 border-b border-tinta/10">
                <span className="font-slab font-bold text-lg leading-none text-boli">1</span>
                <p><b>Android (Chrome):</b> menú ⋮, Instalar app o Añadir a pantalla de inicio.</p>
              </div>
              <div className="flex gap-3 py-3">
                <span className="font-slab font-bold text-lg leading-none text-boli">2</span>
                <p><b>iPhone (Safari):</b> Compartir, Añadir a pantalla de inicio.</p>
              </div>
              <button
                onClick={() => setHelp(false)}
                className="stamp w-full text-boli py-2.5 font-semibold hover:bg-boli hover:text-white active:scale-[0.98] transition"
              >
                Entendido
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  )
}
