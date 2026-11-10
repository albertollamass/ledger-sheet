import { useEffect, useMemo, useState } from 'react'
import { db, isFirebaseConfigured } from '../../firebase.js'
import { createFirestoreLedgerStore } from '../../infrastructure/stores/firestoreStore.js'
import { createLocalLedgerStore } from '../../infrastructure/stores/localStore.js'
import { emptyPreferences, normalizePreferences } from '../../domain/catalog.js'

// Suscribe la UI al LedgerStore activo (Firestore con login, local en demo).
export function useLedger(user, demo) {
  const store = useMemo(() => {
    if (!isFirebaseConfigured || demo) return createLocalLedgerStore()
    if (!user) return null
    return createFirestoreLedgerStore(db, user.uid)
  }, [user, demo])

  const [movements, setMovements] = useState([])
  const [balances, setBalances] = useState({})
  const [rules, setRules] = useState([])
  const [preferences, setPreferences] = useState(emptyPreferences)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)

  useEffect(() => {
    if (!store) {
      setMovements([])
      setBalances({})
      setRules([])
      setPreferences(emptyPreferences())
      setPreferencesLoaded(false)
      return
    }
    setPreferencesLoaded(false)
    const unsub = store.subscribeMovements(setMovements)
    const unsubRules = store.subscribeRules?.(setRules)
    store
      .loadBalances()
      .then(setBalances)
      .catch(() => {})
    Promise.resolve(store.loadPreferences?.())
      .then((p) => {
        if (p) setPreferences(normalizePreferences(p))
      })
      .catch(() => {})
      .finally(() => setPreferencesLoaded(true))
    return () => {
      unsub()
      unsubRules?.()
    }
  }, [store])

  const refreshBalances = async () => {
    if (!store) return
    setBalances(await store.loadBalances())
  }

  const refreshPreferences = async () => {
    if (!store) return
    setPreferences(normalizePreferences(await store.loadPreferences()))
  }

  return {
    store,
    movements,
    balances,
    rules,
    preferences,
    preferencesLoaded,
    refreshBalances,
    refreshPreferences
  }
}
