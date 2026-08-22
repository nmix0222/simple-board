import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';
import { useTheme } from '../ThemeContext.jsx';
import { generatePasskey } from '../hash.js';
import { formatDateTime as formatDate, excerpt } from '../lib/format.js';
import { TAGS, POST_COLORS, ROLLING_PAPER } from '../lib/constants.js';
import { CATEGORY_HUES, gradientFor } from '../lib/categoryTheme.js';
import { isBannedWordError, reportBannedWordViolation } from '../lib/bannedWordPenalty.js';
import AdSlot from '../components/AdSlot.jsx';

const DRAFT_KEY = 'post-draft';

// 정읍고 통합 페이지(허브)로만 안내하기 위해, 게시판 목록에는 개별 반/전체선생님 롤링페이퍼를
// 노출하지 않는다. 데이터/메시지/직접 링크는 전혀 건드리지 않고 목록 표시에서만 제외한다.
const HIDDEN_FROM_LIST_IDS = new Set([
  '5dcc2fd1-9f7e-4ac2-997f-5d0004e97963',
  '2141d98f-bff6-4d6b-9590-fce705ca58bb',
  '5762e3a0-a92f-418e-b436-daf8ae0c64ed',
  'f0484365-7144-47fa-ad58-8ab033ca3fce',
  'f87bb8e5-8a09-4e56-8ac0-668c1d7ddc9d'
]);

export default function Board() {
  const { user } = useSupabaseAuth();
  const { theme } = useTheme();
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [papers, setPapers] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('전체');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState('latest');
  const [visibleCount, setVisibleCount] = useState(20);
  const [authorNames, setAuthorNames] = useState({});

  const [showWriteForm, setShowWriteForm] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [tag, setTag] = useState(TAGS[0]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(POST_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [newPasskey, setNewPasskey] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState('');
  const [deadline, setDeadline] = useState('');
  const [customPasskey, setCustomPasskey] = useState('');

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

  // 분야별로 배경 색조를 은은하게 바꿔서 낭만적인 분위기를 준다
  useEffect(() => {
    const hue = CATEGORY_HUES[currentTab] ?? CATEGORY_HUES['전체'];
    document.documentElement.style.setProperty('--bg-gradient', gradientFor(hue, theme === 'dark'));
    return () => {
      document.documentElement.style.removeProperty('--bg-gradient');
    };
  }, [currentTab, theme]);

  // 다른 사람이 글을 쓰거나 삭제하면 실시간으로 목록에 반영 (새로고침 불필요)
  const loadPostsRef = useRef(loadPosts);
  loadPostsRef.current = loadPosts;
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('posts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        loadPostsRef.current();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

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
      const { data, error } = await supabase.from('rolling_papers_public').select('*').eq('is_deleted', false).order('created_at', { ascending: false });
      const now = Date.now();
      if (!error) {
        setPapers((data || []).filter(p =>
          !HIDDEN_FROM_LIST_IDS.has(p.id) && (!p.deadline || new Date(p.deadline).getTime() > now)
        ));
      }
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
    if (!error) {
      setPosts(data || []);
      const authorIds = [...new Set((data || []).map(p => p.author_id))];
      if (authorIds.length) {
        const { data: profs } = await supabase.from('profiles').select('id, nickname').in('id', authorIds);
        setAuthorNames(Object.fromEntries((profs || []).map(pr => [pr.id, pr.nickname])));
      }
    }
    setLoading(false);
  }

  const filtered = posts.filter(p => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return p.title.toLowerCase().includes(q)
      || p.content.toLowerCase().includes(q)
      || (authorNames[p.author_id] || '').toLowerCase().includes(q);
  });
  const visiblePosts = filtered.slice(0, visibleCount);
  const filteredPapers = papers.filter(p => {
    if (!search.trim()) return true;
    return p.title.toLowerCase().includes(search.trim().toLowerCase());
  });

  function categoryName(id) {
    return categories.find(c => c.id === id)?.name || '';
  }

  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    setImageError('');
    if (!file) { setImageFile(null); setImagePreview(null); return; }
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setImageError('jpg, png, gif, webp 형식만 첨부할 수 있습니다.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('이미지는 5MB 이하만 첨부할 수 있습니다.');
      e.target.value = '';
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    setImageError('');
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

    if (isRollingPaper && customPasskey.trim() && customPasskey.trim().length < 4) {
      alert('패스키는 4자 이상 입력해주세요.');
      return;
    }

    setSubmitting(true);
    let uploadedImagePath = null;
    try {
      if (isRollingPaper) {
        const passkey = customPasskey.trim() ? customPasskey.trim().toUpperCase() : generatePasskey();
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
        setCustomPasskey('');
        loadPosts();
      } else {
        let imageUrl = null;
        if (imageFile) {
          const path = `${user.id}/${Date.now()}-${imageFile.name}`;
          const { error: uploadErr } = await supabase.storage.from('post-images').upload(path, imageFile);
          if (uploadErr) throw uploadErr;
          uploadedImagePath = path;
          imageUrl = supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
        }
        const { error } = await supabase.from('posts').insert({
          category_id: categoryId,
          author_id: user.id,
          title: title.trim(),
          content: content.trim(),
          color,
          tag,
          image_url: imageUrl
        });
        if (error) throw error;
        uploadedImagePath = null;
        localStorage.removeItem(DRAFT_KEY);
        setTitle('');
        setContent('');
        setColor(POST_COLORS[0]);
        removeImage();
        setShowWriteForm(false);
        loadPosts();
      }
    } catch (err) {
      if (uploadedImagePath) await supabase.storage.from('post-images').remove([uploadedImagePath]);
      if (isBannedWordError(err)) {
        const msg = await reportBannedWordViolation(supabase, `${title} ${content}`);
        alert(msg);
      } else {
        alert(err.message || '등록에 실패했습니다.');
      }
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
    setCustomPasskey('');
    removeImage();
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
                <select aria-label="카테고리" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value={ROLLING_PAPER}>롤링페이퍼</option>
                </select>
                {!isRollingPaper && (
                  <select aria-label="태그" value={tag} onChange={e => setTag(e.target.value)} style={{ maxWidth: 110 }}>
                    {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
              </div>
              <div className="row">
                <input
                  type="text"
                  aria-label="제목"
                  placeholder={isRollingPaper ? '롤링페이퍼 제목 (예: OOO를 위한 롤링페이퍼)' : '제목'}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>
              <div className="row">
                <textarea
                  aria-label="내용"
                  placeholder={isRollingPaper ? '소개글 (선택)' : '내용을 입력하세요'}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
              </div>
              {!isRollingPaper && (
                <div className="row color-picker">
                  {POST_COLORS.map((c, i) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`배경색 ${i + 1}`}
                      aria-pressed={c === color}
                      className={`color-swatch${c === color ? ' selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              )}
              {!isRollingPaper && (
                <div className="row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                  <input type="file" aria-label="이미지 첨부" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImageSelect} />
                  {imageError && <div style={{ color: 'var(--danger)', fontSize: 12 }}>{imageError}</div>}
                  {imagePreview && (
                    <div style={{ position: 'relative' }}>
                      <img src={imagePreview} alt="첨부 이미지 미리보기" style={{ maxWidth: 160, maxHeight: 160, borderRadius: 8, border: '1px solid var(--border)' }} />
                      <button type="button" className="link-btn" style={{ marginLeft: 8 }} onClick={removeImage}>제거</button>
                    </div>
                  )}
                </div>
              )}
              {isRollingPaper && (
                <>
                  <div className="row">
                    <input
                      type="datetime-local"
                      aria-label="마감일"
                      value={deadline}
                      onChange={e => setDeadline(e.target.value)}
                      title="마감일 (선택) — 지나면 자동으로 정리됩니다"
                    />
                  </div>
                  <div className="row">
                    <input
                      type="text"
                      aria-label="패스키 직접 설정"
                      placeholder="패스키 직접 설정 (선택, 4자 이상, 비워두면 자동 생성)"
                      value={customPasskey}
                      onChange={e => setCustomPasskey(e.target.value)}
                      maxLength={20}
                    />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 2px 8px' }}>
                    마감일을 선택하면 지난 뒤 새 메시지 작성이 막히고, 목록에서도 자동으로 정리됩니다 (선택 안 하면 계속 유지). 패스키를 직접 입력하지 않으면 6자리 패스키가 자동으로 발급되며, 이 패스키를 아는 사람만 메시지를 남길 수 있어요.
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
        <input type="text" aria-label="게시글 검색" placeholder="제목, 내용, 작성자 검색" value={search} onChange={e => setSearch(e.target.value)} />
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
                  <div className="post-footer">
                    <span className="post-author">💌 메시지 {paper.message_count || 0}개</span>
                    {paper.deadline && <span className="post-author">마감 {formatDate(paper.deadline)}</span>}
                  </div>
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
                    {post.image_url && <span aria-hidden="true">🖼️</span>}
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
