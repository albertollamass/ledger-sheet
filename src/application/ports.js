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
 */

/**
 * LedgerStore: persistencia de movimientos y saldos del usuario.
 * Implementado por infrastructure/stores/* (Firestore, localStorage).
 *
 * @typedef {Object} LedgerStore
 * @property {(cb: (movements: MovementRecord[]) => void) => () => void} subscribeMovements
 * @property {() => Promise<MovementRecord[]>} listMovements
 * @property {(data: Omit<MovementRecord,'id'>) => Promise<MovementRecord>} addMovement
 * @property {(items: Array<Omit<MovementRecord,'id'>>) => Promise<number>} addMovementsBatch
 * @property {(id: string) => Promise<void>} removeMovement
 * @property {() => Promise<Record<string, number>>} loadBalances
 * @property {(year: string|number, value: number) => Promise<void>} saveBalance
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
