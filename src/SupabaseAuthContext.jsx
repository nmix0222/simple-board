import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';

const SupabaseAuthContext = createContext(null);

// 이메일 없이 "아이디"만으로 가입/로그인할 수 있도록, 아이디를 내부적으로만 쓰는
// 가짜 이메일 주소로 변환한다. "@"가 포함된 입력(관리자의 실제 이메일 등)은 그대로 사용한다.
function usernameToEmail(input) {
  const trimmed = input.trim();
  if (trimmed.includes('@')) return trimmed;
  return `${trimmed}@id.simple-board.local`;
}

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
    const { data, error } = await supabase.auth.signUp({
      email: usernameToEmail(email),
      password,
      options: { data: { nickname } }
    });
    if (error) throw error;
    // 이메일 인증이 꺼져 있는 프로젝트라면 signUp이 바로 세션을 돌려줌 —
    // 그 경우 즉시 로그인 상태가 되므로 게시판으로 바로 이동해도 안전하다.
    return { immediateSession: !!data.session };
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(email), password });
    if (error) throw error;
    // 탈퇴한 계정은 비밀번호가 맞아도 로그인 상태를 유지시키지 않는다 — role/status는 여전히
    // DB(RLS)가 실제로 검증하지만, 탈퇴 계정이 그냥 재로그인해서 아무 일 없었다는 듯 쓰는 걸 막는다.
    const { data: prof } = await supabase.from('profiles').select('status').eq('id', data.user.id).single();
    if (prof?.status === 'withdrawn') {
      await supabase.auth.signOut();
      throw new Error('탈퇴한 계정입니다.');
    }
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
    isRestricted: profile?.status === 'restricted',
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
