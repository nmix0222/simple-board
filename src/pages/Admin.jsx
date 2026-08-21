import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';

export default function Admin() {
  const { isAdmin, loginAdmin, logoutAdmin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snapshot => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [isAdmin]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    try {
      await loginAdmin(username.trim(), password);
    } catch (e2) {
      setError('로그인 정보가 올바르지 않습니다.');
    }
  }

  async function handleDelete(id) {
    if (!confirm('이 글을 삭제하시겠습니까?')) return;
    await deleteDoc(doc(db, 'posts', id));
  }

  async function togglePin(post) {
    await updateDoc(doc(db, 'posts', post.id), { pinned: !post.pinned });
  }

  if (!isAdmin) {
    return (
      <div className="write-box">
        <h2>관리자 로그인</h2>
        <form onSubmit={handleLogin}>
          <div className="row">
            <input type="text" placeholder="관리자 아이디" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="row">
            <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{error}</div>}
          <div className="actions">
            <button className="btn-primary" type="submit">로그인</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="list-header">
        <span>관리자 모드 · 전체 {posts.length}개의 글</span>
        <button className="btn-secondary" type="button" onClick={logoutAdmin}>로그아웃</button>
      </div>
      {posts.map(post => (
        <article
          className={`post${post.color && post.color !== '#ffffff' ? ' post-colored' : ''}`}
          key={post.id}
          style={post.color && post.color !== '#ffffff' ? { background: post.color } : undefined}
        >
          <div className="post-top">
            <div className="post-title">
              {post.pinned && <span className="post-category pinned">📌 공지</span>}
              <span className="post-category">{post.category || '자유'}</span>
              {post.title}
            </div>
            <div className="post-meta">조회 {post.views || 0}</div>
          </div>
          <div className="post-body">{post.content}</div>
          <div className="post-footer">
            <span className="post-author">{post.author || '익명'}</span>
            <span>
              <button type="button" className="btn-delete" onClick={() => togglePin(post)} style={{ color: 'var(--accent)' }}>
                {post.pinned ? '고정 해제' : '고정'}
              </button>
              <button type="button" className="btn-delete" onClick={() => handleDelete(post.id)}>삭제</button>
            </span>
          </div>
        </article>
      ))}
    </>
  );
}
