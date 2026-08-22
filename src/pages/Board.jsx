import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';
import { generatePasskey } from '../hash.js';
import { formatDateTime as formatDate, excerpt } from '../lib/format.js';
import { TAGS, POST_COLORS, ROLLING_PAPER } from '../lib/constants.js';
import AdSlot from '../components/AdSlot.jsx';

const DRAFT_KEY = 'post-draft';

export default function Board() {
  const { user } = useSupabaseAuth();
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [papers, setPapers] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('전체');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState('latest');
  const [visibleCount, setVisibleCount] = useState(20);

  const [showWriteForm, setShowWriteForm] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [tag, setTag] = useState(TAGS[0]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(POST_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [newPasskey, setNewPasskey] = useState(null);
  const [deadline, setDeadline] = useState('');

  const isRollingPaper = categoryId === ROLLING_PAPER;

  useEffect(() => {
    if (!supabase) return;
    supabase.from('categories').select('*').order('sort_order').then(({ data }) => {
      setCategories(data || []);
      if (data && data.length) setCategoryId(data[0].id);
    });
    supabase.from('notices').select('*').eq('is_pinned', true).order('created_at', { ascending: false }).limit(3).then(({ data }) => {
      setNotices(data || []);
    });
  }, []);

  useEffect(() => {
    if (!supabase) return;
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, sortMode]);

  useEffect(() => {
    setVisibleCount(20);
  }, [currentTab, search, sortMode]);

  // 임시저장 불러오기 (글쓰기 창을 처음 열 때)
  useEffect(() => {
    if (!showWriteForm) return;
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (saved && saved.title) {
        setTitle(saved.title);
        setContent(saved.content || '');
      }
    } catch (e) { /* ignore */ }
  }, [showWriteForm]);

  // 임시저장 (제목/내용이 바뀔 때마다)
  useEffect(() => {
    if (!showWriteForm || isRollingPaper) return;
    const t = setTimeout(() => {
      if (title.trim() || content.trim()) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, content }));
      }
    }, 500);
    return () => clearTimeout(t);
  }, [title, content, showWriteForm, isRollingPaper]);

  async function loadPosts() {
    setLoading(true);
    if (currentTab === '롤링페이퍼') {
      const { data, error } = await supabase.from('rolling_papers_public').select('*').order('created_at', { ascending: false });
      const now = Date.now();
      if (!error) setPapers((data || []).filter(p => !p.deadline || new Date(p.deadline).getTime() > now));
      setLoading(false);
      return;
    }
    let query = supabase.from('posts').select('*').eq('is_deleted', false);
    if (currentTab !== '전체') {
      const cat = categories.find(c => c.name === currentTab);
      if (cat) query = query.eq('category_id', cat.id);
    }
    query = sortMode === 'popular'
      ? query.order('is_pinned', { ascending: false }).order('like_count', { ascending: false })
      : query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    const { data, error } = await query.limit(200);
    if (!error) setPosts(data || []);
    setLoading(false);
  }

  const filtered = posts.filter(p => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
  });
  const visiblePosts = filtered.slice(0, visibleCount);
  const filteredPapers = papers.filter(p => {
    if (!search.trim()) return true;
    return p.title.toLowerCase().includes(search.trim().toLowerCase());
  });

  function categoryName(id) {
    return categories.find(c => c.id === id)?.name || '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) {
      alert('로그인 후 이용해주세요.');
      return;
    }
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (!isRollingPaper && !content.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      if (isRollingPaper) {
        const passkey = generatePasskey();
        const { error } = await supabase.rpc('create_rolling_paper', {
          p_title: title.trim(),
          p_category_id: null,
          p_target_subject: null,
          p_description: content.trim() || null,
          p_visibility: 'passkey',
          p_passkey: passkey,
          p_allow_anonymous: true,
          p_deadline: deadline ? new Date(deadline).toISOString() : null
        });
        if (error) throw error;
        setNewPasskey(passkey);
        setTitle('');
        setContent('');
        setDeadline('');
        loadPosts();
      } else {
        const { error } = await supabase.from('posts').insert({
          category_id: categoryId,
          author_id: user.id,
          title: title.trim(),
          content: content.trim(),
          color,
          tag
        });
        if (error) throw error;
        localStorage.removeItem(DRAFT_KEY);
        setTitle('');
        setContent('');
        setColor(POST_COLORS[0]);
        setShowWriteForm(false);
        loadPosts();
      }
    } catch (err) {
      alert(err.message || '등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  function closeWriteForm() {
    setShowWriteForm(false);
    setNewPasskey(null);
    setTitle('');
    setContent('');
    setColor(POST_COLORS[0]);
    setDeadline('');
  }

  if (!supabase) {
    return <div className="empty">Supabase 설정이 완료되지 않았습니다.</div>;
  }

  return (
    <>
      <button type="button" className="fab" onClick={() => setShowWriteForm(true)} title="글쓰기">+</button>

      {showWriteForm && (
        <div className="modal-overlay" onClick={closeWriteForm}>
          <section className="write-box modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>글쓰기</h2>
              <button type="button" className="modal-close" onClick={closeWriteForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="row">
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value={ROLLING_PAPER}>롤링페이퍼</option>
                </select>
                {!isRollingPaper && (
                  <select value={tag} onChange={e => setTag(e.target.value)} style={{ maxWidth: 110 }}>
                    {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
              </div>
              <div className="row">
                <input
                  type="text"
                  placeholder={isRollingPaper ? '롤링페이퍼 제목 (예: OOO를 위한 롤링페이퍼)' : '제목'}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>
              <div className="row">
                <textarea
                  placeholder={isRollingPaper ? '소개글 (선택)' : '내용을 입력하세요'}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
              </div>
              {!isRollingPaper && (
                <div className="row color-picker">
                  {POST_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`color-swatch${c === color ? ' selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              )}
              {isRollingPaper && (
                <>
                  <div className="row">
                    <input
                      type="datetime-local"
                      value={deadline}
                      onChange={e => setDeadline(e.target.value)}
                      title="마감일 (선택) — 지나면 자동으로 정리됩니다"
                    />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 2px 8px' }}>
                    마감일을 선택하면 지난 뒤 새 메시지 작성이 막히고, 목록에서도 자동으로 정리됩니다 (선택 안 하면 계속 유지). 등록하면 6자리 패스키가 발급되며, 이 패스키를 아는 사람만 메시지를 남길 수 있어요.
                  </p>
                </>
              )}
              {!user && (
                <p style={{ fontSize: 12, color: 'var(--danger)', margin: '4px 2px 8px' }}>
                  로그인 후 작성할 수 있습니다.
                </p>
              )}
              <div className="actions">
                <button className="btn-primary" type="submit" disabled={submitting || !user}>등록</button>
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

      {notices.length > 0 && currentTab === '전체' && (
        <div className="notice-strip">
          {notices.map(n => (
            <Link to="/notices" key={n.id} className="notice-row">
              <span className="notice-badge">공지</span>{n.title}
            </Link>
          ))}
        </div>
      )}

      <div className="tabs">
        <button type="button" className={`tab${currentTab === '전체' ? ' active' : ''}`} onClick={() => setCurrentTab('전체')}>전체</button>
        {categories.map(c => (
          <button key={c.id} type="button" className={`tab${currentTab === c.name ? ' active' : ''}`} onClick={() => setCurrentTab(c.name)}>
            {c.name}
          </button>
        ))}
        <button type="button" className={`tab${currentTab === '롤링페이퍼' ? ' active' : ''}`} onClick={() => setCurrentTab('롤링페이퍼')}>롤링페이퍼</button>
      </div>

      <div className="row">
        <input type="text" placeholder="제목, 내용 검색" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {currentTab !== '롤링페이퍼' && (
        <div className="list-header">
          <span>{filtered.length}개의 글</span>
          <div className="sort-toggle">
            <button type="button" className={sortMode === 'latest' ? 'active' : ''} onClick={() => setSortMode('latest')}>최신순</button>
            <button type="button" className={sortMode === 'popular' ? 'active' : ''} onClick={() => setSortMode('popular')}>인기순</button>
          </div>
        </div>
      )}

      <section>
        {loading ? (
          <div className="empty">불러오는 중...</div>
        ) : currentTab === '롤링페이퍼' ? (
          filteredPapers.length === 0 ? (
            <div className="empty">아직 만들어진 롤링페이퍼가 없습니다.</div>
          ) : (
            filteredPapers.map(paper => (
              <Link to={`/paper/${paper.id}`} key={paper.id} style={{ display: 'block' }}>
                <article className="post">
                  <div className="post-top">
                    <div className="post-title">
                      <span className="post-category">🔒 롤링페이퍼</span>
                      {paper.title}
                    </div>
                    <div className="post-meta">{formatDate(paper.created_at)}</div>
                  </div>
                  {paper.description && <div className="post-body">{excerpt(paper.description)}</div>}
                  {paper.deadline && (
                    <div className="post-footer"><span className="post-author">마감 {formatDate(paper.deadline)}</span></div>
                  )}
                </article>
              </Link>
            ))
          )
        ) : filtered.length === 0 ? (
          <div className="empty">{search.trim() ? '검색 결과가 없습니다.' : '아직 등록된 글이 없습니다.'}</div>
        ) : (
          visiblePosts.map(post => (
            <Link to={`/post/${post.id}`} key={post.id} style={{ display: 'block' }}>
              <article
                className={`post${post.color && post.color !== '#ffffff' ? ' post-colored' : ''}`}
                style={post.color && post.color !== '#ffffff' ? { background: post.color } : undefined}
              >
                <div className="post-top">
                  <div className="post-title">
                    {post.is_pinned && <span className="post-category pinned">📌 공지</span>}
                    {post.tag && <span className="post-category">{post.tag}</span>}
                    <span className="post-category">{categoryName(post.category_id)}</span>
                    {post.title}
                  </div>
                  <div className="post-meta">{formatDate(post.created_at)} · 조회 {post.view_count}</div>
                </div>
                <div className="post-body">{excerpt(post.content)}</div>
                <div className="post-footer">
                  <span className="post-author">추천 {post.like_count} · 댓글 {post.comment_count}</span>
                </div>
              </article>
            </Link>
          ))
        )}
      </section>

      {currentTab !== '롤링페이퍼' && visibleCount < filtered.length && (
        <div className="actions" style={{ justifyContent: 'center', marginTop: 4 }}>
          <button className="btn-secondary" type="button" onClick={() => setVisibleCount(v => v + 20)}>
            더보기 ({filtered.length - visibleCount}개 더 있음)
          </button>
        </div>
      )}
    </>
  );
}
