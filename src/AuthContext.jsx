import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut
} from 'firebase/auth';
import { auth } from './firebase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [uid, setUid] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error('익명 로그인 실패', e);
        }
        return;
      }
      setUid(user.uid);
      setIsAdmin(!user.isAnonymous);
      setReady(true);
    });
    return unsub;
  }, []);

  async function loginAdmin(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logoutAdmin() {
    await signOut(auth);
    await signInAnonymously(auth);
  }

  return (
    <AuthContext.Provider value={{ uid, isAdmin, ready, loginAdmin, logoutAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
