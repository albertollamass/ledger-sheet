// Infraestructura: sesión con Firebase Auth. Adaptador driven.

import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../firebase.js'

export const watchSession = (cb) => onAuthStateChanged(auth, cb)

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider)

export const signOutUser = () => signOut(auth)
