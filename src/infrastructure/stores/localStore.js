// Infraestructura: LedgerStore en localStorage (modo demo). Adaptador driven.
// Mismas claves que siempre para no perder datos existentes.

const MOVEMENTS_KEY = 'demo-movements'
const BALANCES_KEY = 'demo-balances'

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

export function createLocalLedgerStore() {
  let movements = read(MOVEMENTS_KEY, [])
  let balances = read(BALANCES_KEY, {})
  const listeners = new Set()
  let seq = 0

  const persist = () => {
    try {
      localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements))
      localStorage.setItem(BALANCES_KEY, JSON.stringify(balances))
    } catch {}
  }
  const emit = () => listeners.forEach((cb) => cb([...movements]))

  return {
    subscribeMovements(cb) {
      listeners.add(cb)
      cb([...movements])
      return () => listeners.delete(cb)
    },

    async listMovements() {
      return [...movements]
    },

    async addMovement(data) {
      const record = { id: `local-${Date.now()}-${seq++}`, ...data }
      movements = [record, ...movements]
      persist()
      emit()
      return record
    },

    async addMovementsBatch(items) {
      const fresh = items.map((m, i) => ({ id: `imp-${Date.now()}-${i}`, ...m }))
      movements = [...fresh, ...movements]
      persist()
      emit()
      return fresh.length
    },

    async removeMovement(id) {
      movements = movements.filter((m) => m.id !== id)
      persist()
      emit()
    },

    async loadBalances() {
      return { ...balances }
    },

    async saveBalance(year, value) {
      balances = { ...balances, [String(year)]: Number(value) || 0 }
      persist()
    }
  }
}
