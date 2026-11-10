// Aplicación: casos de uso de movimientos recurrentes.
// Orquesta dominio + puerto LedgerStore.

import { dueOccurrences, movementFromRule, ruleFromForm } from '../domain/recurring.js'

/** Crea una regla a partir de los valores del formulario. */
export async function saveRule(store, values) {
  return store.addRule(ruleFromForm(values))
}

/** Actualiza una regla (pausar, reactivar, cambiar importe…). */
export async function updateRule(store, id, patch) {
  return store.updateRule(id, patch)
}

/** Borra una regla. */
export async function removeRule(store, id) {
  return store.removeRule(id)
}

/**
 * Apunta los movimientos que ya tocan y aún no se habían generado.
 * Devuelve cuántos se han creado y en cuántas reglas.
 */
export async function runRecurring(store, rules, todayISO) {
  const plans = []
  for (const rule of rules || []) {
    const dates = dueOccurrences(rule, todayISO)
    if (dates.length) plans.push({ rule, dates })
  }
  if (!plans.length) return { created: 0, rules: 0 }

  const movements = plans.flatMap(({ rule, dates }) =>
    dates.map((date) => ({
      ...movementFromRule(rule, date),
      // Id determinista: si dos pestañas se ponen al día a la vez, no duplican.
      id: `rec-${rule.id}-${date}`
    }))
  )

  await store.addMovementsBatch(movements)
  for (const { rule, dates } of plans) {
    await store.updateRule(rule.id, { lastRun: dates[dates.length - 1] })
  }

  return { created: movements.length, rules: plans.length }
}
