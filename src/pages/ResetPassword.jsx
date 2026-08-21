import { useState } from 'react';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';

export default function ResetPassword() {
  const { sendPasswordReset } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      <form onSubmit={handleSubmit}>
        <div className="row">
          <input type="email" placeholder="가입한 이메일" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{error}</div>}
        <div className="actions">
          <button className="btn-primary" type="submit" disabled={submitting}>재설정 메일 보내기</button>
        </div>
      </form>
    </div>
  );
}
