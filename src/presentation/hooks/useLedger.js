import { useEffect, useMemo, useState } from 'react'
import { db, isFirebaseConfigured } from '../../firebase.js'
import { createFirestoreLedgerStore } from '../../infrastructure/stores/firestoreStore.js'
import { createLocalLedgerStore } from '../../infrastructure/stores/localStore.js'

// Suscribe la UI al LedgerStore activo (Firestore con login, local en demo).
export function useLedger(user, demo) {
  const store = useMemo(() => {
    if (!isFirebaseConfigured || demo) return createLocalLedgerStore()
    if (!user) return null
    return createFirestoreLedgerStore(db, user.uid)
  }, [user, demo])

  const [movements, setMovements] = useState([])
  const [balances, setBalances] = useState({})

  useEffect(() => {
    if (!store) {
      setMovements([])
      setBalances({})
      return
    }
    const unsub = store.subscribeMovements(setMovements)
    store
      .loadBalances()
      .then(setBalances)
      .catch(() => {})
    return unsub
  }, [store])

  const refreshBalances = async () => {
    if (!store) return
    setBalances(await store.loadBalances())
  }

  return { store, movements, balances, refreshBalances }
}
