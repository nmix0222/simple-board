import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';

export default function ProfilePage() {
  const { user, profile, updateNickname, withdraw, signOut } = useSupabaseAuth();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!user || !profile) {
    return <div className="content-page">로그인이 필요합니다.</div>;
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (nickname.trim().length < 2) {
      setError('닉네임은 2자 이상 입력해주세요.');
      return;
    }
    try {
      await updateNickname(nickname.trim());
      setMessage('닉네임이 변경되었습니다.');
    } catch (err) {
      setError(err.message?.includes('duplicate') ? '이미 사용 중인 닉네임입니다.' : (err.message || '변경 실패'));
    }
  }

  async function handleWithdraw() {
    if (!confirm('정말 탈퇴하시겠습니까? 작성한 글/댓글은 남지만 더 이상 로그인할 수 없습니다.')) return;
    await withdraw();
    navigate('/');
  }

  return (
    <div className="write-box">
      <h2>프로필</h2>
      <div className="row">
        <input type="text" value={user.email} disabled style={{ opacity: 0.6 }} />
      </div>
      <form onSubmit={handleSave}>
        <div className="row">
          <input type="text" placeholder="닉네임" value={nickname} onChange={e => setNickname(e.target.value)} />
        </div>
        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{error}</div>}
        {message && <div style={{ color: 'var(--accent)', fontSize: 13, marginBottom: 8 }}>{message}</div>}
        <div className="actions" style={{ gap: 8 }}>
          <button className="btn-secondary" type="button" onClick={signOut}>로그아웃</button>
          <button className="btn-primary" type="submit">저장</button>
        </div>
      </form>
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button type="button" className="btn-delete" onClick={handleWithdraw}>회원 탈퇴</button>
      </div>
    </div>
  );
}
