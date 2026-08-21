import { useEffect, useState } from 'react';
import {
  collection, addDoc, doc, updateDoc, increment,
  query, orderBy, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { sha256Hex, generatePasskey } from '../hash.js';
import AdSlot from '../components/AdSlot.jsx';
import PostCard from '../components/PostCard.jsx';
import RollingPaperCard from '../components/RollingPaperCard.jsx';

const CATEGORIES = ['자유', '연예인', '개그', '유머', '스포츠', '게임', '영화/드라마', '음악', 'IT', '질문', '롤링페이퍼'];
const POST_COLORS = ['#ffffff', '#fff4cc', '#ffe0e6', '#dbeafe', '#dcfce7', '#f3e8ff', '#ffedd5', '#e0f2fe'];

export default function Board() {
  const [posts, setPosts] = useState([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [currentTab, setCurrentTab] = useState('전체');
  const [author, setAuthor] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(POST_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [newPasskey, setNewPasskey] = useState(null);

  const isRollingPaper = category === '롤링페이퍼';

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snapshot => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.deleted));
    });
    return unsub;
  }, []);

  const filtered = currentTab === '전체' ? posts : posts.filter(p => p.category === currentTab);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (!isRollingPaper && !content.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }
    if (password.trim().length < 4) {
      alert('수정/삭제를 위한 비밀번호를 4자리 이상 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const passwordHash = await sha256Hex(password.trim());
      if (isRollingPaper) {
        const passkey = generatePasskey();
        const passkeyHash = await sha256Hex(passkey);
        await addDoc(collection(db, 'posts'), {
          category,
          author: author.trim(),
          passwordHash,
          title: title.trim(),
          content: '',
          passkeyHash,
          createdAt: serverTimestamp()
        });
        setNewPasskey(passkey);
      } else {
        await addDoc(collection(db, 'posts'), {
          category,
          author: author.trim(),
          passwordHash,
          title: title.trim(),
          content: content.trim(),
          color,
          reactions: {},
          commentCount: 0,
          createdAt: serverTimestamp()
        });
      }
      setTitle('');
      setContent('');
      setPassword('');
      setColor(POST_COLORS[0]);
    } finally {
      setSubmitting(false);
    }
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
              placeholder={isRollingPaper ? '롤링페이퍼 제목 (예: OOO를 위한 롤링페이퍼)' : '제목'}
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          {!isRollingPaper && (
            <>
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
            </>
          )}
          <div className="row">
            <input
              type="password"
              placeholder="비밀번호 (수정/삭제 시 필요, 4자리 이상)"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {isRollingPaper && (
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 2px 8px' }}>
              등록하면 6자리 패스키가 발급됩니다. 이 패스키를 아는 사람만 롤링페이퍼에 들어와 메시지를 남길 수 있어요.
            </p>
          )}
          <div className="actions">
            <button className="btn-primary" type="submit" disabled={submitting}>등록</button>
          </div>
        </form>

        {newPasskey && (
          <div className="passkey-display">
            <div>생성된 패스키</div>
            <div className="passkey-code">{newPasskey}</div>
            <div className="passkey-hint">이 패스키가 있어야만 들어올 수 있어요. 꼭 저장/공유해두세요.</div>
            <div className="actions" style={{ justifyContent: 'center', marginTop: 10 }}>
              <button className="btn-secondary" type="button" onClick={() => setNewPasskey(null)}>확인</button>
            </div>
          </div>
        )}
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
          filtered.map(post =>
            post.category === '롤링페이퍼' ? (
              <RollingPaperCard key={post.id} post={post} />
            ) : (
              <PostCard key={post.id} post={post} onReact={handleReact} />
            )
          )
        )}
      </section>
    </>
  );
}
