import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './firebase.js';

const AuthContext = createContext(null);

export const ADMIN_EMAIL = 'nmixx@simple-board.local';

function usernameToEmail(username) {
  if (username.includes('@')) return username;
  return `${username}@simple-board.local`;
}

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setIsAdmin(!!user);
      setAdminEmail(user ? user.email : null);
    });
    return unsub;
  }, []);

  async function loginAdmin(username, password) {
    await signInWithEmailAndPassword(auth, usernameToEmail(username), password);
  }

  async function logoutAdmin() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ isAdmin, adminEmail, loginAdmin, logoutAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
