import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';

const SupabaseAuthContext = createContext(null);

export function SupabaseAuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null);

  async function loadProfile(userId) {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data || null);
  }

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session?.user?.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      loadProfile(newSession?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signUp({ email, password, nickname }) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname } }
    });
    if (error) throw error;
  }

  async function signIn({ email, password }) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function sendPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}#/update-password`
    });
    if (error) throw error;
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async function updateNickname(nickname) {
    const { error } = await supabase.from('profiles').update({ nickname }).eq('id', session.user.id);
    if (error) throw error;
    await loadProfile(session.user.id);
  }

  async function withdraw() {
    const { error } = await supabase.from('profiles').update({ status: 'withdrawn' }).eq('id', session.user.id);
    if (error) throw error;
    await signOut();
  }

  const value = {
    session,
    user: session?.user || null,
    profile,
    isAdmin: profile?.role === 'admin',
    loading: session === undefined,
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    updatePassword,
    updateNickname,
    withdraw
  };

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
}

export function useSupabaseAuth() {
  return useContext(SupabaseAuthContext);
}
