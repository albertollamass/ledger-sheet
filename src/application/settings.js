// Aplicación: preferencias del usuario (nombres personalizados).

import { normalizePreferences } from '../domain/catalog.js'

/** Guarda los nombres personalizados de grupos y tipos. */
export async function savePreferences(store, prefs) {
  const clean = normalizePreferences(prefs)
  await store.savePreferences(clean)
  return clean
}
