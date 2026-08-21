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

const PAGE_SIZE = 20;

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
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState('latest');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const isRollingPaper = category === '롤링페이퍼';

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snapshot => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.deleted));
    });
    return unsub;
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [currentTab, search, sortMode]);

  function reactionTotal(post) {
    return Object.values(post.reactions || {}).reduce((sum, n) => sum + n, 0);
  }

  const filtered = (currentTab === '전체' ? posts : posts.filter(p => p.category === currentTab))
    .filter(p => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (p.title || '').toLowerCase().includes(q) || (p.content || '').toLowerCase().includes(q);
    });

  const sorted = [...filtered].sort((a, b) => {
    if (!!b.pinned !== !!a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    if (sortMode === 'popular') {
      const score = (post) => reactionTotal(post) * 3 + (post.views || 0) + (post.commentCount || 0) * 2;
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
    }
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  });

  const visiblePosts = sorted.slice(0, visibleCount);

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
      if (!isRollingPaper) setShowWriteForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  function closeWriteForm() {
    setShowWriteForm(false);
    setNewPasskey(null);
  }

  async function handleReact(id, emoji) {
    await updateDoc(doc(db, 'posts', id), { [`reactions.${emoji}`]: increment(1) });
  }

  return (
    <>
      <button type="button" className="fab" onClick={() => setShowWriteForm(true)} title="글쓰기">
        +
      </button>

      {showWriteForm && (
        <div className="modal-overlay" onClick={closeWriteForm}>
          <section className="write-box modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>글쓰기</h2>
              <button type="button" className="modal-close" onClick={closeWriteForm}>✕</button>
            </div>
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
                  <button className="btn-secondary" type="button" onClick={closeWriteForm}>확인</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

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

      <div className="row">
        <input
          type="text"
          placeholder="제목, 내용 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="list-header">
        <span>{filtered.length}개의 글</span>
        <div className="sort-toggle">
          <button
            type="button"
            className={sortMode === 'latest' ? 'active' : ''}
            onClick={() => setSortMode('latest')}
          >
            최신순
          </button>
          <button
            type="button"
            className={sortMode === 'popular' ? 'active' : ''}
            onClick={() => setSortMode('popular')}
          >
            인기순
          </button>
        </div>
      </div>

      <section>
        {sorted.length === 0 ? (
          <div className="empty">{search.trim() ? '검색 결과가 없습니다.' : '아직 등록된 글이 없습니다.'}</div>
        ) : (
          visiblePosts.map(post =>
            post.category === '롤링페이퍼' ? (
              <RollingPaperCard key={post.id} post={post} />
            ) : (
              <PostCard key={post.id} post={post} onReact={handleReact} />
            )
          )
        )}
      </section>

      {visibleCount < sorted.length && (
        <div className="actions" style={{ justifyContent: 'center', marginTop: 4 }}>
          <button className="btn-secondary" type="button" onClick={() => setVisibleCount(v => v + PAGE_SIZE)}>
            더보기 ({sorted.length - visibleCount}개 더 있음)
          </button>
        </div>
      )}
    </>
  );
}
