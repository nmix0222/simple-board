import { useEffect, useState } from 'react';
import { collection, addDoc, doc, updateDoc, increment, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏'];

function formatDate(ts) {
  if (!ts || typeof ts.toDate !== 'function') return '방금 전';
  const d = ts.toDate();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PostCard({ post, onDelete, onReact }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(null);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (!open) return;
    const q = query(collection(db, 'posts', post.id, 'comments'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snapshot => {
      setComments(snapshot.docs.map(d => d.data()));
    });
    return unsub;
  }, [open, post.id]);

  async function submitComment(e) {
    e.preventDefault();
    if (!commentText.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }
    await addDoc(collection(db, 'posts', post.id, 'comments'), {
      author: commentAuthor.trim(),
      content: commentText.trim(),
      createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, 'posts', post.id), { commentCount: increment(1) });
    setCommentText('');
  }

  const reactions = post.reactions || {};

  return (
    <article className="post" style={post.color && post.color !== '#ffffff' ? { background: post.color } : undefined}>
      <div className="post-top">
        <div className="post-title">
          <span className="post-category">{post.category || '자유'}</span>
          {post.title}
        </div>
        <div className="post-meta">{formatDate(post.createdAt)}</div>
      </div>
      <div className="post-body">{post.content}</div>
      <div className="post-footer">
        <span className="post-author">{post.author || '익명'}</span>
        <button type="button" className="btn-delete" onClick={() => onDelete(post.id)}>삭제</button>
      </div>
      <div className="reaction-bar">
        {EMOJIS.map(e => (
          <button key={e} type="button" className="reaction-btn" onClick={() => onReact(post.id, e)}>
            {e} {reactions[e] || 0}
          </button>
        ))}
      </div>
      <button type="button" className="comment-toggle" onClick={() => setOpen(o => !o)}>
        💬 댓글 {post.commentCount || 0}{open ? ' 접기' : ' 보기'}
      </button>
      {open && (
        <div className="comment-section">
          {comments === null ? (
            <div className="comment-loading">불러오는 중...</div>
          ) : comments.length === 0 ? (
            <div className="comment-loading">아직 댓글이 없습니다.</div>
          ) : (
            comments.map((c, i) => (
              <div className="comment-item" key={i}>
                <span className="comment-author">{c.author || '익명'}</span>
                {c.content}
              </div>
            ))
          )}
          <form className="comment-form" onSubmit={submitComment}>
            <input type="text" placeholder="이름" value={commentAuthor} onChange={e => setCommentAuthor(e.target.value)} />
            <input type="text" placeholder="댓글을 입력하세요" value={commentText} onChange={e => setCommentText(e.target.value)} />
            <button className="btn-primary" type="submit">등록</button>
          </form>
        </div>
      )}
    </article>
  );
}
