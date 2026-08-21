import { useEffect, useState } from 'react';
import { collection, addDoc, doc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { sha256Hex } from '../hash.js';

const CARD_COLORS = ['#fff4cc', '#ffe0e6', '#dbeafe', '#dcfce7', '#f3e8ff', '#ffedd5'];

function formatDate(ts) {
  if (!ts || typeof ts.toDate !== 'function') return '방금 전';
  const d = ts.toDate();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RollingPaperCard({ post, onDelete }) {
  const { uid, isAdmin } = useAuth();
  const canModify = !!uid && (post.authorUid === uid || isAdmin);

  const [passkeyInput, setPasskeyInput] = useState('');
  const [verifiedHash, setVerifiedHash] = useState(null);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState(null);
  const [msgAuthor, setMsgAuthor] = useState('');
  const [msgContent, setMsgContent] = useState('');

  useEffect(() => {
    if (!verifiedHash) return;
    const q = query(collection(db, 'posts', post.id, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snapshot => {
      setMessages(snapshot.docs.map(d => d.data()));
    });
    return unsub;
  }, [verifiedHash, post.id]);

  async function handleUnlock(e) {
    e.preventDefault();
    setError('');
    const hash = await sha256Hex(passkeyInput.trim().toUpperCase());
    if (hash !== post.passkeyHash) {
      setError('패스키가 올바르지 않습니다.');
      return;
    }
    setVerifiedHash(hash);
  }

  async function handleAddMessage(e) {
    e.preventDefault();
    if (!msgContent.trim()) {
      alert('메시지 내용을 입력해주세요.');
      return;
    }
    await addDoc(collection(db, 'posts', post.id, 'messages'), {
      author: msgAuthor.trim(),
      content: msgContent.trim(),
      proof: verifiedHash,
      createdAt: serverTimestamp()
    });
    setMsgAuthor('');
    setMsgContent('');
  }

  return (
    <article className="post">
      <div className="post-top">
        <div className="post-title">
          <span className="post-category">🔒 롤링페이퍼</span>
          {post.title}
        </div>
        <div className="post-meta">{formatDate(post.createdAt)}</div>
      </div>
      <div className="post-footer">
        <span className="post-author">{post.author || '익명'}</span>
        {canModify && (
          <button type="button" className="btn-delete" onClick={() => onDelete(post.id)}>삭제</button>
        )}
      </div>

      {!verifiedHash ? (
        <form className="comment-form" onSubmit={handleUnlock} style={{ marginTop: 10 }}>
          <input
            type="text"
            placeholder="패스키 입력"
            value={passkeyInput}
            onChange={e => setPasskeyInput(e.target.value)}
          />
          <button className="btn-primary" type="submit">입장</button>
        </form>
      ) : (
        <div className="comment-section">
          <div className="message-wall">
            {messages === null ? null : messages.length === 0 ? (
              <div className="empty">아직 남겨진 메시지가 없습니다.</div>
            ) : (
              messages.map((m, i) => (
                <div className="message-card" style={{ background: CARD_COLORS[i % CARD_COLORS.length] }} key={i}>
                  <div className="message-author">{m.author || '익명'}</div>
                  <div className="message-content">{m.content}</div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleAddMessage} style={{ marginTop: 12 }}>
            <div className="row">
              <input type="text" placeholder="이름" style={{ maxWidth: 120 }} value={msgAuthor} onChange={e => setMsgAuthor(e.target.value)} />
            </div>
            <div className="row">
              <textarea placeholder="따뜻한 메시지를 남겨주세요" value={msgContent} onChange={e => setMsgContent(e.target.value)} />
            </div>
            <div className="actions">
              <button className="btn-primary" type="submit">남기기</button>
            </div>
          </form>
        </div>
      )}
      {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{error}</div>}
    </article>
  );
}
