import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';

export default function SignUp() {
  const { signUp } = useSupabaseAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (nickname.trim().length < 2) {
      setError('닉네임은 2자 이상 입력해주세요.');
      return;
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const { immediateSession } = await signUp({ email: email.trim(), password, nickname: nickname.trim() });
      if (immediateSession) {
        navigate('/');
      } else {
        setDone(true);
      }
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setError('이미 가입된 이메일입니다.');
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
        <p>입력하신 이메일로 인증 메일을 보냈습니다. 메일함에서 인증 링크를 눌러주셔야 글쓰기·댓글 작성이 가능합니다.</p>
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
          <input type="text" placeholder="닉네임 (2자 이상)" value={nickname} onChange={e => setNickname(e.target.value)} />
        </div>
        <div className="row">
          <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="row">
          <input type="password" placeholder="비밀번호 (8자 이상)" value={password} onChange={e => setPassword(e.target.value)} />
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
