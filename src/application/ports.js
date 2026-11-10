// Aplicación: puertos (driven). Contratos que la aplicación NECESITA;
// la infraestructura los implementa. Sin dependencias.

/**
 * @typedef {Object} MovementRecord
 * @property {string} [id]
 * @property {'ingreso'|'gasto'} kind
 * @property {string} group
 * @property {string} label
 * @property {number} amount
 * @property {string} date - 'YYYY-MM-DD'
 * @property {number} year
 * @property {number} month - 1..12
 * @property {string} [note]
 * @property {string|null} [recurringId] - regla que lo generó, si es automático
 */

/**
 * @typedef {Object} RecurringRule
 * @property {string} [id]
 * @property {'ingreso'|'gasto'} kind
 * @property {string} group
 * @property {string} label
 * @property {number} amount
 * @property {number} day - 1..31 (si el mes es más corto, último día)
 * @property {string} startDate - 'YYYY-MM-DD'
 * @property {string} [note]
 * @property {boolean} active
 * @property {string|null} [lastRun] - última fecha generada 'YYYY-MM-DD'
 */

/**
 * @typedef {Object} UserPreferences
 * @property {Record<string,string>} [labels] - nombre visible por tipo canónico
 * @property {Record<string,string>} [groups] - nombre visible por grupo canónico
 */

/**
 * LedgerStore: persistencia de movimientos, saldos, reglas y preferencias.
 * Implementado por infrastructure/stores/* (Firestore, localStorage).
 *
 * @typedef {Object} LedgerStore
 * @property {(cb: (movements: MovementRecord[]) => void) => () => void} subscribeMovements
 * @property {() => Promise<MovementRecord[]>} listMovements
 * @property {(data: Omit<MovementRecord,'id'>) => Promise<MovementRecord>} addMovement
 * @property {(items: Array<Omit<MovementRecord,'id'> & { id?: string }>) => Promise<number>} addMovementsBatch
 * @property {(id: string) => Promise<void>} removeMovement
 * @property {() => Promise<Record<string, number>>} loadBalances
 * @property {(year: string|number, value: number) => Promise<void>} saveBalance
 * @property {(cb: (rules: RecurringRule[]) => void) => () => void} subscribeRules
 * @property {(data: Omit<RecurringRule,'id'>) => Promise<RecurringRule>} addRule
 * @property {(id: string, patch: Partial<RecurringRule>) => Promise<RecurringRule|void>} updateRule
 * @property {(id: string) => Promise<void>} removeRule
 * @property {() => Promise<UserPreferences>} loadPreferences
 * @property {(prefs: UserPreferences) => Promise<void>} savePreferences
 */

/**
 * WorkbookReader: extrae hojas como matrices de celdas desde un .xlsx.
 * Implementado por infrastructure/excelReader.js (librería xlsx).
 *
 * @typedef {Object} WorkbookSheet
 * @property {string} name
 * @property {Array<Array<unknown>>} matrix
 *
 * @typedef {(arrayBuffer: ArrayBuffer) => Array<WorkbookSheet>} WorkbookReader
 */

export {}
