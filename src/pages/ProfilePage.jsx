import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';
import { formatDate } from '../lib/format.js';

// 회원가입 시 "아이디"를 내부적으로 가짜 이메일(아이디@id.simple-board.local)로 저장하므로,
// 화면에는 원래 아이디만 보여준다. 관리자 계정처럼 실제 이메일로 가입한 경우엔 그대로 보여준다.
function displayUsername(email) {
  if (!email) return '';
  return email.endsWith('@id.simple-board.local') ? email.split('@')[0] : email;
}

export default function ProfilePage() {
  const { user, profile, updateNickname, updatePassword, withdraw, signOut } = useSupabaseAuth();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [bookmarks, setBookmarks] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [newPassword, setNewPassword] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('post_bookmarks')
      .select('created_at, posts(id, title, created_at)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setBookmarks((data || []).filter(b => b.posts)));

    supabase
      .from('comments')
      .select('id, content, created_at, post_id, posts(title)')
      .eq('author_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setMyComments((data || []).filter(c => c.posts)));

    supabase
      .from('post_likes')
      .select('created_at, posts(id, title, created_at)')
      .eq('user_id', user.id)
      .eq('value', 1)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setLikedPosts((data || []).filter(l => l.posts)));
  }, [user]);

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPwError('');
    setPwMessage('');
    if (newPassword.length < 6) {
      setPwError('비밀번호는 6자 이상 입력해주세요.');
      return;
    }
    try {
      await updatePassword(newPassword);
      setPwMessage('비밀번호가 변경되었습니다.');
      setNewPassword('');
    } catch (err) {
      setPwError(err.message || '변경에 실패했습니다.');
    }
  }

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
        <input type="text" aria-label="아이디" value={displayUsername(user.email)} disabled style={{ opacity: 0.6 }} />
      </div>
      <form onSubmit={handleSave}>
        <div className="row">
          <input type="text" aria-label="닉네임" placeholder="닉네임" value={nickname} onChange={e => setNickname(e.target.value)} />
        </div>
        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{error}</div>}
        {message && <div style={{ color: 'var(--accent)', fontSize: 13, marginBottom: 8 }}>{message}</div>}
        <div className="actions" style={{ gap: 8 }}>
          <button className="btn-secondary" type="button" onClick={signOut}>로그아웃</button>
          <button className="btn-primary" type="submit">저장</button>
        </div>
      </form>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 15, margin: '0 0 10px' }}>비밀번호 변경</h3>
        <form onSubmit={handlePasswordChange}>
          <div className="row">
            <input type="password" aria-label="새 비밀번호" placeholder="새 비밀번호 (6자 이상)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          {pwError && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{pwError}</div>}
          {pwMessage && <div style={{ color: 'var(--accent)', fontSize: 13, marginBottom: 8 }}>{pwMessage}</div>}
          <div className="actions"><button className="btn-primary" type="submit">변경</button></div>
        </form>
      </div>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 15, margin: '0 0 10px' }}>내가 작성한 글</h3>
        <Link to={`/user/${user.id}`} style={{ fontSize: 13, color: 'var(--accent)' }}>내가 쓴 글 전체 보기 →</Link>
      </div>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 15, margin: '0 0 10px' }}>내가 작성한 댓글</h3>
        {myComments.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>작성한 댓글이 없습니다.</p>
        ) : (
          myComments.map(c => (
            <div key={c.id} style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
              <Link to={`/post/${c.post_id}`} style={{ color: 'var(--accent)' }}>{c.posts.title}</Link>
              <div style={{ color: 'var(--muted)', marginTop: 2 }}>{c.content}</div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 15, margin: '0 0 10px' }}>내가 추천한 글</h3>
        {likedPosts.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>추천한 글이 없습니다.</p>
        ) : (
          likedPosts.map(l => (
            <div key={l.posts.id} style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
              <Link to={`/post/${l.posts.id}`} style={{ color: 'var(--accent)' }}>{l.posts.title}</Link>
              <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{formatDate(l.posts.created_at)}</span>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 15, margin: '0 0 10px' }}>스크랩한 글</h3>
        {bookmarks.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>스크랩한 글이 없습니다.</p>
        ) : (
          bookmarks.map(b => (
            <div key={b.posts.id} style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
              <Link to={`/post/${b.posts.id}`} style={{ color: 'var(--accent)' }}>{b.posts.title}</Link>
              <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{formatDate(b.posts.created_at)}</span>
            </div>
          ))
        )}
      </div>
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button type="button" className="btn-delete" onClick={handleWithdraw}>회원 탈퇴</button>
      </div>
    </div>
  );
}
