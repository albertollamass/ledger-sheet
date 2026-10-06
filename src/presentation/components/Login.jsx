import { useState } from 'react'
import { isFirebaseConfigured } from '../../firebase.js'
import { signInWithGoogle } from '../../infrastructure/auth.js'

export function Login({ onDemo }) {
  const [err, setErr] = useState('')

  const loginGoogle = async () => {
    setErr('')
    try {
      await signInWithGoogle()
    } catch (e2) {
      setErr(e2.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md px-8 py-10 ledger-margin shadow-[4px_4px_0_0_rgba(29,42,77,0.12)]">
        <p className="font-slab text-rojo text-lg">cuaderno de cuentas</p>
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
