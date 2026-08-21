import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';

export default function UpdatePassword() {
  const { updatePassword } = useSupabaseAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('비밀번호는 8자 이상 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err.message || '변경에 실패했습니다. 재설정 링크를 다시 요청해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="write-box">
        <h2>비밀번호 변경 완료</h2>
        <p>잠시 후 메인 페이지로 이동합니다.</p>
      </div>
    );
  }

  return (
    <div className="write-box">
      <h2>새 비밀번호 설정</h2>
      <form onSubmit={handleSubmit}>
        <div className="row">
          <input type="password" placeholder="새 비밀번호 (8자 이상)" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{error}</div>}
        <div className="actions">
          <button className="btn-primary" type="submit" disabled={submitting}>변경하기</button>
        </div>
      </form>
    </div>
  );
}
