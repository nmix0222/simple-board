import { useEffect, useState } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, increment, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { sha256Hex } from '../hash.js';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏'];
const CATEGORIES = ['자유', '연예인', '개그', '유머', '스포츠', '게임', '영화/드라마', '음악', 'IT', '질문'];
const POST_COLORS = ['#ffffff', '#fff4cc', '#ffe0e6', '#dbeafe', '#dcfce7', '#f3e8ff', '#ffedd5', '#e0f2fe'];

function formatDate(ts) {
  if (!ts || typeof ts.toDate !== 'function') return '방금 전';
  const d = ts.toDate();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PostCard({ post, onReact }) {
  const { isAdmin } = useAuth();

  const [editing, setEditing] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [editTitle, setEditTitle] = useState(post.title);
  const [editContent, setEditContent] = useState(post.content);
  const [editCategory, setEditCategory] = useState(post.category);
  const [editColor, setEditColor] = useState(post.color || POST_COLORS[0]);

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

  function startEdit() {
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditCategory(post.category);
    setEditColor(post.color || POST_COLORS[0]);
    setEditPassword('');
    setEditing(true);
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editTitle.trim() || !editContent.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }
    const payload = {
      title: editTitle.trim(),
      content: editContent.trim(),
      category: editCategory,
      color: editColor
    };
    try {
      if (isAdmin) {
        await updateDoc(doc(db, 'posts', post.id), payload);
      } else {
        const proof = await sha256Hex(editPassword.trim());
        await updateDoc(doc(db, 'posts', post.id), { ...payload, proof });
      }
      setEditing(false);
    } catch (err) {
      alert('비밀번호가 일치하지 않습니다.');
    }
  }

  async function handleDelete() {
    if (!confirm('이 글을 삭제하시겠습니까?')) return;
    if (isAdmin) {
      await deleteDoc(doc(db, 'posts', post.id));
      return;
    }
    const pw = window.prompt('비밀번호를 입력하세요');
    if (pw === null) return;
    try {
      const proof = await sha256Hex(pw.trim());
      await updateDoc(doc(db, 'posts', post.id), {
        deleted: true,
        title: '(삭제된 게시물)',
        content: '',
        proof
      });
    } catch (err) {
      alert('비밀번호가 일치하지 않습니다.');
    }
  }

  const reactions = post.reactions || {};

  if (editing) {
    return (
      <article className="post">
        <form onSubmit={saveEdit}>
          <div className="row">
            <select value={editCategory} onChange={e => setEditCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="row">
            <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
          </div>
          <div className="row">
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)} />
          </div>
          <div className="row color-picker">
            {POST_COLORS.map(c => (
              <button
                key={c}
                type="button"
                className={`color-swatch${c === editColor ? ' selected' : ''}`}
                style={{ background: c }}
                onClick={() => setEditColor(c)}
              />
            ))}
          </div>
          {!isAdmin && (
            <div className="row">
              <input
                type="password"
                placeholder="비밀번호"
                value={editPassword}
                onChange={e => setEditPassword(e.target.value)}
              />
            </div>
          )}
          <div className="actions" style={{ gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>취소</button>
            <button type="submit" className="btn-primary">저장</button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article
      className={`post${post.color && post.color !== '#ffffff' ? ' post-colored' : ''}`}
      style={post.color && post.color !== '#ffffff' ? { background: post.color } : undefined}
    >
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
        <span>
          <button type="button" className="btn-delete" onClick={startEdit} style={{ color: 'var(--accent)' }}>수정</button>
          <button type="button" className="btn-delete" onClick={handleDelete}>삭제</button>
        </span>
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
