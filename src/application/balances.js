// Aplicación: casos de uso de saldos iniciales. Orquesta dominio + puerto LedgerStore.

/** Guarda el saldo inicial de un año. */
export async function saveBalance(store, year, value) {
  return store.saveBalance(String(year), Number(value) || 0)
}
