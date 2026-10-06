// Aplicación: casos de uso de movimientos. Orquesta dominio + puerto LedgerStore.

import { movementFromForm } from '../domain/movement.js'

/** Guarda un movimiento desde los valores del formulario. Devuelve el registro guardado. */
export async function saveMovement(store, formValues) {
  return store.addMovement(movementFromForm(formValues))
}

/** Borra un movimiento por id. */
export async function removeMovement(store, id) {
  return store.removeMovement(id)
}
