import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';

export default function SignIn() {
  const { signIn } = useSupabaseAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
      navigate('/');
    } catch (err) {
      if (err.message?.includes('Invalid login credentials')) {
        setError('이메일 또는 비밀번호가 일치하지 않습니다.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.');
      } else {
        setError(err.message || '로그인에 실패했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="write-box">
      <h2>로그인</h2>
      <form onSubmit={handleSubmit}>
        <div className="row">
          <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="row">
          <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{error}</div>}
        <div className="actions">
          <button className="btn-primary" type="submit" disabled={submitting}>로그인</button>
        </div>
      </form>
      <p style={{ fontSize: 13, marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
        <Link to="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>회원가입</Link>
        <Link to="/reset-password" style={{ color: 'var(--muted)' }}>비밀번호를 잊으셨나요?</Link>
      </p>
    </div>
  );
}
