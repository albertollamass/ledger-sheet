// Infraestructura: LedgerStore en localStorage (modo demo). Adaptador driven.
// Mismas claves que siempre para no perder datos existentes.

const MOVEMENTS_KEY = 'demo-movements'
const BALANCES_KEY = 'demo-balances'
const RULES_KEY = 'demo-recurring'
const PREFS_KEY = 'demo-preferences'

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
  let rules = read(RULES_KEY, [])
  let preferences = read(PREFS_KEY, { labels: {}, groups: {} })
  const listeners = new Set()
  const ruleListeners = new Set()
  let seq = 0

  const persist = () => {
    try {
      localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements))
      localStorage.setItem(BALANCES_KEY, JSON.stringify(balances))
      localStorage.setItem(RULES_KEY, JSON.stringify(rules))
      localStorage.setItem(PREFS_KEY, JSON.stringify(preferences))
    } catch {}
  }
  const emit = () => listeners.forEach((cb) => cb([...movements]))
  const emitRules = () => ruleListeners.forEach((cb) => cb([...rules]))

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
      const fresh = items.map((m, i) => ({ ...m, id: m.id || `imp-${Date.now()}-${i}` }))
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
    },

    subscribeRules(cb) {
      ruleListeners.add(cb)
      cb([...rules])
      return () => ruleListeners.delete(cb)
    },

    async listRules() {
      return [...rules]
    },

    async addRule(data) {
      const record = { id: `rule-${Date.now()}-${seq++}`, ...data }
      rules = [record, ...rules]
      persist()
      emitRules()
      return record
    },

    async updateRule(id, patch) {
      rules = rules.map((r) => (r.id === id ? { ...r, ...patch } : r))
      persist()
      emitRules()
      return rules.find((r) => r.id === id)
    },

    async removeRule(id) {
      rules = rules.filter((r) => r.id !== id)
      persist()
      emitRules()
    },

    async loadPreferences() {
      return JSON.parse(JSON.stringify(preferences))
    },

    async savePreferences(prefs) {
      preferences = prefs || { labels: {}, groups: {} }
      persist()
      return preferences
    }
  }
}
