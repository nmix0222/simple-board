import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';

export default function ResetPassword() {
  const { sendPasswordReset } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 회원가입은 아이디(이메일 아님)로 하기 때문에, 대부분의 계정은 실제 이메일이 없어
  // "이메일로 재설정 링크 발송" 방식이 통하지 않는다. "@"가 있는 진짜 이메일 계정
  // (예: 관리자)만 이 방식을 쓸 수 있고, 나머지는 로그인 후 비밀번호 변경을 이용하거나
  // 로그인이 아예 안 되는 경우 문의하기로 관리자에게 요청해야 한다.
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || '요청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="write-box">
        <h2>비밀번호 재설정</h2>
        <p>입력하신 이메일로 재설정 링크를 보냈습니다. 메일함을 확인해주세요.</p>
      </div>
    );
  }

  return (
    <div className="write-box">
      <h2>비밀번호 재설정</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>
        이 사이트는 이메일이 아닌 아이디로 가입합니다. 대부분의 계정은 이메일이 없어 아래 방식으로
        재설정 메일을 받을 수 없습니다. <strong>로그인이 가능하다면</strong> 로그인 후 프로필
        페이지에서 바로 비밀번호를 변경해주세요. <strong>로그인 자체가 안 된다면</strong>{' '}
        <Link to="/contact" style={{ color: 'var(--accent)' }}>문의하기</Link>를 통해 관리자에게 요청해주세요.
        (실제 이메일로 가입한 관리자 계정만 아래 방식이 동작합니다.)
      </p>
      <form onSubmit={handleSubmit}>
        <div className="row">
          <input type="email" placeholder="이메일로 가입한 계정만 입력" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{error}</div>}
        <div className="actions">
          <button className="btn-primary" type="submit" disabled={submitting}>재설정 메일 보내기</button>
        </div>
      </form>
    </div>
  );
}
