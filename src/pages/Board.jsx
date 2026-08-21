import { useEffect, useState } from 'react';
import {
  collection, addDoc, deleteDoc, doc, updateDoc, increment,
  query, orderBy, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase.js';
import AdSlot from '../components/AdSlot.jsx';
import PostCard from '../components/PostCard.jsx';

const CATEGORIES = ['자유', '연예인', '개그', '유머', '스포츠', '게임', '영화/드라마', '음악', 'IT', '질문'];
const POST_COLORS = ['#ffffff', '#fff4cc', '#ffe0e6', '#dbeafe', '#dcfce7', '#f3e8ff', '#ffedd5', '#e0f2fe'];

export default function Board() {
  const [posts, setPosts] = useState([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [currentTab, setCurrentTab] = useState('전체');
  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(POST_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snapshot => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const filtered = currentTab === '전체' ? posts : posts.filter(p => p.category === currentTab);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        category,
        author: author.trim(),
        title: title.trim(),
        content: content.trim(),
        color,
        reactions: {},
        commentCount: 0,
        createdAt: serverTimestamp()
      });
      setTitle('');
      setContent('');
      setColor(POST_COLORS[0]);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('이 글을 삭제하시겠습니까?')) return;
    await deleteDoc(doc(db, 'posts', id));
  }

  async function handleReact(id, emoji) {
    await updateDoc(doc(db, 'posts', id), { [`reactions.${emoji}`]: increment(1) });
  }

  return (
    <>
      <section className="write-box">
        <h2>글쓰기</h2>
        <form onSubmit={handleSubmit}>
          <div className="row">
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="text"
              placeholder="이름"
              style={{ maxWidth: 120 }}
              value={author}
              onChange={e => setAuthor(e.target.value)}
            />
          </div>
          <div className="row">
            <input
              type="text"
              placeholder="제목"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div className="row">
            <textarea
              placeholder="내용을 입력하세요"
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>
          <div className="row color-picker">
            {POST_COLORS.map(c => (
              <button
                key={c}
                type="button"
                className={`color-swatch${c === color ? ' selected' : ''}`}
                style={{ background: c }}
                title="글 색상"
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <div className="actions">
            <button className="btn-primary" type="submit" disabled={submitting}>등록</button>
          </div>
        </form>
      </section>

      <AdSlot />

      <div className="tabs">
        {['전체', ...CATEGORIES].map(c => (
          <button
            key={c}
            type="button"
            className={`tab${c === currentTab ? ' active' : ''}`}
            onClick={() => setCurrentTab(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="list-header">
        <span>{filtered.length}개의 글</span>
      </div>

      <section>
        {filtered.length === 0 ? (
          <div className="empty">아직 등록된 글이 없습니다.</div>
        ) : (
          filtered.map(post => (
            <PostCard key={post.id} post={post} onDelete={handleDelete} onReact={handleReact} />
          ))
        )}
      </section>
    </>
  );
}
