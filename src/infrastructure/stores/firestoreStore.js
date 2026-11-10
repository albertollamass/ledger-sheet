// Infraestructura: LedgerStore en Firestore. Adaptador driven.

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch
} from 'firebase/firestore'

const movementsCol = (db, uid) => collection(db, `users/${uid}/movements`)
const settingsCol = (db, uid) => collection(db, `users/${uid}/yearSettings`)
const rulesCol = (db, uid) => collection(db, `users/${uid}/recurring`)
const prefsDoc = (db, uid) => doc(db, `users/${uid}/settings/preferences`)

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
          const { id, ...data } = m
          batch.set(id ? doc(movementsCol(db, uid), id) : doc(movementsCol(db, uid)), {
            ...data,
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
    },

    subscribeRules(cb) {
      return onSnapshot(rulesCol(db, uid), (s) =>
        cb(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      )
    },

    async addRule(data) {
      const ref = await addDoc(rulesCol(db, uid), {
        ...data,
        createdAt: new Date().toISOString()
      })
      return { id: ref.id, ...data }
    },

    async updateRule(id, patch) {
      await setDoc(doc(db, `users/${uid}/recurring/${id}`), patch, { merge: true })
    },

    async removeRule(id) {
      await deleteDoc(doc(db, `users/${uid}/recurring/${id}`))
    },

    async loadPreferences() {
      const snap = await getDoc(prefsDoc(db, uid))
      return snap.exists() ? snap.data() : { labels: {}, groups: {} }
    },

    async savePreferences(prefs) {
      await setDoc(prefsDoc(db, uid), prefs || { labels: {}, groups: {} })
    }
  }
}
