import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';

export default function SignUp() {
  const { signUp } = useSupabaseAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (username.trim().length < 2) {
      setError('아이디는 2자 이상 입력해주세요.');
      return;
    }
    if (nickname.trim().length < 2) {
      setError('닉네임은 2자 이상 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const { immediateSession } = await signUp({ email: username.trim(), password, nickname: nickname.trim() });
      if (immediateSession) {
        navigate('/');
      } else {
        setDone(true);
      }
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setError('이미 사용 중인 아이디입니다.');
      } else {
        setError(err.message || '회원가입에 실패했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="write-box">
        <h2>회원가입 완료</h2>
        <p>이제 로그인하실 수 있습니다.</p>
        <div className="actions" style={{ gap: 8 }}>
          <button className="btn-secondary" onClick={() => navigate('/')}>게시판 둘러보기</button>
          <button className="btn-primary" onClick={() => navigate('/signin')}>로그인하러 가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="write-box">
      <h2>회원가입</h2>
      <form onSubmit={handleSubmit}>
        <div className="row">
          <input type="text" aria-label="아이디" placeholder="아이디 (2자 이상)" value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        <div className="row">
          <input type="text" aria-label="닉네임" placeholder="닉네임 (2자 이상)" value={nickname} onChange={e => setNickname(e.target.value)} />
        </div>
        <div className="row">
          <input type="password" aria-label="비밀번호" placeholder="비밀번호 (6자 이상)" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{error}</div>}
        <div className="actions">
          <button className="btn-primary" type="submit" disabled={submitting}>가입하기</button>
        </div>
      </form>
      <p style={{ fontSize: 13, marginTop: 12 }}>
        이미 계정이 있으신가요? <Link to="/signin" style={{ color: 'var(--accent)', fontWeight: 600 }}>로그인</Link>
      </p>
    </div>
  );
}
