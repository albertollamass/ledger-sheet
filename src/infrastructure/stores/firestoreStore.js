// Infraestructura: LedgerStore en Firestore. Adaptador driven.

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch
} from 'firebase/firestore'

const movementsCol = (db, uid) => collection(db, `users/${uid}/movements`)
const settingsCol = (db, uid) => collection(db, `users/${uid}/yearSettings`)

export function createFirestoreLedgerStore(db, uid) {
  return {
    subscribeMovements(cb) {
      const q = query(movementsCol(db, uid), orderBy('date', 'desc'))
      return onSnapshot(q, (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
    },

    async listMovements() {
      const s = await getDocs(movementsCol(db, uid))
      return s.docs.map((d) => ({ id: d.id, ...d.data() }))
    },

    async addMovement(data) {
      const ref = await addDoc(movementsCol(db, uid), {
        ...data,
        createdAt: new Date().toISOString()
      })
      return { id: ref.id, ...data }
    },

    async addMovementsBatch(items) {
      let n = 0
      for (let i = 0; i < items.length; i += 400) {
        const batch = writeBatch(db)
        items.slice(i, i + 400).forEach((m) => {
          batch.set(doc(movementsCol(db, uid)), {
            ...m,
            createdAt: new Date().toISOString()
          })
        })
        await batch.commit()
        n += Math.min(400, items.length - i)
      }
      return n
    },

    async removeMovement(id) {
      await deleteDoc(doc(db, `users/${uid}/movements/${id}`))
    },

    async loadBalances() {
      const s = await getDocs(settingsCol(db, uid))
      const b = {}
      s.docs.forEach((d) => (b[d.id] = d.data().initialBalance || 0))
      return b
    },

    async saveBalance(year, value) {
      await setDoc(doc(db, `users/${uid}/yearSettings/${String(year)}`), {
        initialBalance: Number(value) || 0
      })
    }
  }
}
