import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';
import { formatDateTime as formatDate } from '../lib/format.js';

const REASON_LABELS = {
  abuse: '욕설', defamation: '악의적인 비방', sexual: '성적인 콘텐츠',
  privacy: '개인정보 노출', spam: '스팸', other: '기타'
};
const STATUS_LABELS = { pending: '대기', reviewing: '검토중', resolved: '완료', dismissed: '기각' };
const ROLE_LABELS = { user: '일반회원', admin: '관리자' };
const MEMBER_STATUS_LABELS = { active: '정상', restricted: '이용정지', withdrawn: '탈퇴' };
const LOG_ACTION_LABELS = {
  toggle_pin: '게시글 고정 변경', hard_delete_post: '게시글 완전삭제', delete_comment: '댓글 삭제',
  create_notice: '공지 등록', delete_notice: '공지 삭제', add_banned_word: '금칙어 추가',
  delete_banned_word: '금칙어 삭제', unrestrict_user: '이용제한 해제',
  report_deferred: '신고 검토중 처리', report_keep_content: '신고 콘텐츠 유지', report_delete_content: '신고 콘텐츠 삭제',
  report_dismiss: '신고 기각', create_category: '카테고리 추가', delete_category: '카테고리 삭제',
  toggle_notice_pin: '공지 고정 변경'
};

export default function Admin() {
  const { user, profile, isAdmin, loading } = useSupabaseAuth();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentSearch, setCommentSearch] = useState('');
  const [reports, setReports] = useState([]);
  const [notices, setNotices] = useState([]);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [members, setMembers] = useState([]);
  const [bannedWords, setBannedWords] = useState([]);
  const [newBannedWord, setNewBannedWord] = useState('');
  const [logs, setLogs] = useState([]);
  const [logAdminNames, setLogAdminNames] = useState({});
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'dashboard') {
      loadStats();
    } else if (tab === 'posts') {
      supabase.from('posts').select('*').order('created_at', { ascending: false }).then(({ data }) => setPosts(data || []));
    } else if (tab === 'comments') {
      loadComments();
    } else if (tab === 'reports') {
      supabase.from('reports').select('*').order('created_at', { ascending: false }).then(({ data }) => setReports(data || []));
    } else if (tab === 'notices') {
      loadNotices();
    } else if (tab === 'members') {
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(({ data }) => setMembers(data || []));
    } else if (tab === 'banned') {
      loadBannedWords();
    } else if (tab === 'logs') {
      loadLogs();
    } else if (tab === 'categories') {
      loadCategories();
    }
  }, [isAdmin, tab]);

  async function loadStats() {
    const [postsRes, commentsRes, membersRes, pendingReportsRes] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    ]);
    setStats({
      posts: postsRes.count ?? 0,
      comments: commentsRes.count ?? 0,
      members: membersRes.count ?? 0,
      pendingReports: pendingReportsRes.count ?? 0
    });
  }

  async function loadComments() {
    const { data } = await supabase.from('comments').select('*').order('created_at', { ascending: false }).limit(200);
    setComments(data || []);
  }

  async function loadNotices() {
    const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
    setNotices(data || []);
  }

  async function loadBannedWords() {
    const { data } = await supabase.from('banned_words').select('*').order('created_at', { ascending: false });
    setBannedWords(data || []);
  }

  async function loadLogs() {
    const { data } = await supabase.from('admin_activity_logs').select('*').order('created_at', { ascending: false }).limit(200);
    setLogs(data || []);
    const adminIds = [...new Set((data || []).map(l => l.admin_id).filter(Boolean))];
    if (adminIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, nickname').in('id', adminIds);
      setLogAdminNames(Object.fromEntries((profs || []).map(p => [p.id, p.nickname])));
    }
  }

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('*').order('sort_order');
    setCategories(data || []);
  }

  async function addCategory(e) {
    e.preventDefault();
    const name = newCategoryName.trim();
    const slug = newCategorySlug.trim();
    if (!name || !slug) return;
    const nextOrder = categories.length ? Math.max(...categories.map(c => c.sort_order)) + 1 : 1;
    const { data, error } = await supabase.from('categories').insert({ name, slug, sort_order: nextOrder }).select().single();
    if (error) {
      alert(error.message.includes('duplicate') ? '이미 존재하는 이름 또는 slug입니다.' : error.message);
      return;
    }
    await logAdmin('create_category', 'category', data.id, { name, slug });
    setNewCategoryName('');
    setNewCategorySlug('');
    loadCategories();
  }

  async function deleteCategory(cat) {
    const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('category_id', cat.id);
    if (count > 0) {
      alert(`"${cat.name}" 카테고리에 게시글이 ${count}개 있어 삭제할 수 없습니다. 게시글을 먼저 다른 카테고리로 옮기거나 삭제해주세요.`);
      return;
    }
    if (!confirm(`"${cat.name}" 카테고리를 삭제하시겠습니까?`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', cat.id);
    if (error) { alert(error.message); return; }
    await logAdmin('delete_category', 'category', cat.id, { name: cat.name });
    loadCategories();
  }

  async function logAdmin(action, targetType, targetId, detail) {
    await supabase.rpc('log_admin_action', { p_action: action, p_target_type: targetType, p_target_id: targetId, p_detail: detail || null });
  }

  async function createNotice(e) {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;
    const { data } = await supabase.from('notices').insert({ author_id: user.id, title: noticeTitle.trim(), content: noticeContent.trim() }).select().single();
    if (data) await logAdmin('create_notice', 'notice', data.id, { title: data.title });
    setNoticeTitle('');
    setNoticeContent('');
    loadNotices();
  }

  async function deleteNotice(id) {
    if (!confirm('공지사항을 삭제하시겠습니까?')) return;
    await supabase.from('notices').delete().eq('id', id);
    await logAdmin('delete_notice', 'notice', id);
    loadNotices();
  }

  async function toggleNoticePin(notice) {
    await supabase.from('notices').update({ is_pinned: !notice.is_pinned }).eq('id', notice.id);
    await logAdmin('toggle_notice_pin', 'notice', notice.id, { is_pinned: !notice.is_pinned });
    setNotices(notices.map(n => n.id === notice.id ? { ...n, is_pinned: !n.is_pinned } : n));
  }

  async function togglePin(post) {
    await supabase.from('posts').update({ is_pinned: !post.is_pinned }).eq('id', post.id);
    await logAdmin('toggle_pin', 'post', post.id, { is_pinned: !post.is_pinned });
    setPosts(posts.map(p => p.id === post.id ? { ...p, is_pinned: !p.is_pinned } : p));
  }

  async function hardDelete(post) {
    if (!confirm('완전히 삭제하시겠습니까?')) return;
    await supabase.from('posts').delete().eq('id', post.id);
    await logAdmin('hard_delete_post', 'post', post.id, { title: post.title });
    setPosts(posts.filter(p => p.id !== post.id));
  }

  async function deleteComment(comment) {
    if (!confirm('댓글을 완전히 삭제하시겠습니까?')) return;
    await supabase.from('comments').delete().eq('id', comment.id);
    await logAdmin('delete_comment', 'comment', comment.id, { content: comment.content?.slice(0, 100) });
    setComments(comments.filter(c => c.id !== comment.id));
  }

  async function logAction(report, status, action) {
    await supabase.from('reports').update({ status }).eq('id', report.id);
    await supabase.from('report_actions').insert({ report_id: report.id, admin_id: user.id, action });
    await logAdmin('report_' + action, report.target_type, report.target_id, { report_id: report.id, reason: report.reason });
    setReports(reports.map(r => r.id === report.id ? { ...r, status } : r));
  }

  async function deleteReportedContent(report) {
    if (!confirm('신고된 콘텐츠를 삭제하시겠습니까?')) return;
    const table = { post: 'posts', comment: 'comments', rolling_paper: 'rolling_papers', rolling_paper_message: 'rolling_paper_messages' }[report.target_type];
    if (table) await supabase.from(table).delete().eq('id', report.target_id);
    await logAction(report, 'resolved', 'delete_content');
  }

  async function addBannedWord(e) {
    e.preventDefault();
    const word = newBannedWord.trim();
    if (!word) return;
    const { data, error } = await supabase.from('banned_words').insert({ word, created_by: user.id }).select().single();
    if (error) {
      alert(error.message.includes('duplicate') ? '이미 등록된 금칙어입니다.' : error.message);
      return;
    }
    await logAdmin('add_banned_word', 'banned_word', data.id, { word });
    setNewBannedWord('');
    loadBannedWords();
  }

  async function deleteBannedWord(bw) {
    if (!confirm(`"${bw.word}" 금칙어를 삭제하시겠습니까?`)) return;
    await supabase.from('banned_words').delete().eq('id', bw.id);
    await logAdmin('delete_banned_word', 'banned_word', bw.id, { word: bw.word });
    loadBannedWords();
  }

  async function warnMember(member) {
    const reason = prompt(`${member.nickname}님에게 경고를 남깁니다. 사유를 입력해주세요.`);
    if (!reason || !reason.trim()) return;
    await supabase.rpc('restrict_user', { p_user_id: member.id, p_type: 'warning', p_reason: reason.trim() });
    alert('경고를 등록했습니다.');
  }

  async function suspendMember(member) {
    const reason = prompt(`${member.nickname}님을 이용정지합니다. 사유를 입력해주세요.`);
    if (!reason || !reason.trim()) return;
    await supabase.rpc('restrict_user', { p_user_id: member.id, p_type: 'suspension', p_reason: reason.trim() });
    setMembers(members.map(m => m.id === member.id ? { ...m, status: 'restricted' } : m));
  }

  async function unsuspendMember(member) {
    if (!confirm(`${member.nickname}님의 이용정지를 해제하시겠습니까?`)) return;
    await supabase.rpc('unrestrict_user', { p_user_id: member.id });
    setMembers(members.map(m => m.id === member.id ? { ...m, status: 'active' } : m));
  }

  const filteredComments = commentSearch.trim()
    ? comments.filter(c => c.content?.toLowerCase().includes(commentSearch.trim().toLowerCase()))
    : comments;

  if (loading) return <div className="empty">확인 중...</div>;

  if (!user) {
    return (
      <div className="content-page">
        <h2>관리자 페이지</h2>
        <p>로그인이 필요합니다. <Link to="/signin" style={{ color: 'var(--accent)' }}>로그인하러 가기</Link></p>
      </div>
    );
  }

  if (!isAdmin) {
    return <div className="content-page"><h2>접근 권한이 없습니다</h2><p>관리자만 볼 수 있는 페이지입니다.</p></div>;
  }

  return (
    <>
      <div className="list-header">
        <span>관리자 모드 ({profile?.nickname})</span>
      </div>
      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        <button type="button" className={`tab${tab === 'dashboard' ? ' active' : ''}`} onClick={() => setTab('dashboard')}>대시보드</button>
        <button type="button" className={`tab${tab === 'posts' ? ' active' : ''}`} onClick={() => setTab('posts')}>게시글 관리</button>
        <button type="button" className={`tab${tab === 'comments' ? ' active' : ''}`} onClick={() => setTab('comments')}>댓글 관리</button>
        <button type="button" className={`tab${tab === 'reports' ? ' active' : ''}`} onClick={() => setTab('reports')}>신고 관리</button>
        <button type="button" className={`tab${tab === 'members' ? ' active' : ''}`} onClick={() => setTab('members')}>회원 관리</button>
        <button type="button" className={`tab${tab === 'notices' ? ' active' : ''}`} onClick={() => setTab('notices')}>공지사항 관리</button>
        <button type="button" className={`tab${tab === 'categories' ? ' active' : ''}`} onClick={() => setTab('categories')}>카테고리 관리</button>
        <button type="button" className={`tab${tab === 'banned' ? ' active' : ''}`} onClick={() => setTab('banned')}>금칙어 관리</button>
        <button type="button" className={`tab${tab === 'logs' ? ' active' : ''}`} onClick={() => setTab('logs')}>관리자 로그</button>
      </div>

      {tab === 'dashboard' && (
        stats === null ? <div className="empty">불러오는 중...</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {[
              ['게시글 수', stats.posts],
              ['댓글 수', stats.comments],
              ['회원 수', stats.members],
              ['대기 중인 신고', stats.pendingReports]
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>{value}</div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'posts' && posts.map(post => (
        <article className="post" key={post.id}>
          <div className="post-top">
            <div className="post-title">
              {post.is_pinned && <span className="post-category pinned">📌</span>}
              {post.is_deleted && <span className="post-category" style={{ color: 'var(--danger)' }}>삭제됨</span>}
              {post.title}
            </div>
          </div>
          <div className="post-footer">
            <span className="post-author">조회 {post.view_count} · 추천 {post.like_count}</span>
            <span>
              <button type="button" className="btn-delete" style={{ color: 'var(--accent)' }} onClick={() => togglePin(post)}>
                {post.is_pinned ? '고정 해제' : '고정'}
              </button>
              <button type="button" className="btn-delete" onClick={() => hardDelete(post)}>완전삭제</button>
            </span>
          </div>
        </article>
      ))}

      {tab === 'comments' && (
        <>
          <div className="row" style={{ marginBottom: 12 }}>
            <input type="text" placeholder="댓글 내용 검색" value={commentSearch} onChange={e => setCommentSearch(e.target.value)} />
          </div>
          {filteredComments.length === 0 ? <div className="empty">댓글이 없습니다.</div> : filteredComments.map(c => (
            <article className="post" key={c.id}>
              <div className="post-top">
                <div className="post-meta">
                  {c.is_deleted && <span className="post-category" style={{ color: 'var(--danger)' }}>삭제됨</span>}
                  {formatDate(c.created_at)}
                </div>
              </div>
              <div className="post-body">{c.content}</div>
              <div className="post-footer">
                <span className="post-author">글 ID: {c.post_id}</span>
                <button type="button" className="btn-delete" onClick={() => deleteComment(c)}>완전삭제</button>
              </div>
            </article>
          ))}
        </>
      )}

      {tab === 'reports' && (
        reports.length === 0 ? <div className="empty">접수된 신고가 없습니다.</div> : reports.map(r => (
          <article className="post" key={r.id}>
            <div className="post-top">
              <div className="post-title">
                <span className="post-category">{r.target_type}</span>
                {REASON_LABELS[r.reason]}
              </div>
              <div className="post-meta">{STATUS_LABELS[r.status]}</div>
            </div>
            {r.detail && <div className="post-body">{r.detail}</div>}
            <div className="post-footer">
              <span className="post-author">대상 ID: {r.target_id}</span>
              <span>
                <button type="button" className="btn-delete" style={{ color: 'var(--accent)' }} onClick={() => logAction(r, 'reviewing', 'deferred')}>검토중</button>
                <button type="button" className="btn-delete" style={{ color: 'var(--accent)' }} onClick={() => logAction(r, 'resolved', 'keep_content')}>콘텐츠 유지</button>
                <button type="button" className="btn-delete" onClick={() => deleteReportedContent(r)}>콘텐츠 삭제</button>
                <button type="button" className="btn-delete" onClick={() => logAction(r, 'dismissed', 'dismiss')}>기각</button>
              </span>
            </div>
          </article>
        ))
      )}

      {tab === 'members' && (
        members.length === 0 ? <div className="empty">회원이 없습니다.</div> : members.map(m => (
          <article className="post" key={m.id}>
            <div className="post-top">
              <div className="post-title">
                {m.nickname}
                <span className="post-category" style={{ marginLeft: 8 }}>{ROLE_LABELS[m.role] || m.role}</span>
              </div>
              <div className="post-meta" style={{ color: m.status === 'restricted' ? 'var(--danger)' : 'inherit' }}>
                {MEMBER_STATUS_LABELS[m.status] || m.status}
              </div>
            </div>
            <div className="post-footer">
              <span className="post-author">가입일 {formatDate(m.created_at)}</span>
              {m.role !== 'admin' && (
                <span>
                  <button type="button" className="btn-delete" style={{ color: 'var(--accent)' }} onClick={() => warnMember(m)}>경고</button>
                  {m.status === 'restricted' ? (
                    <button type="button" className="btn-delete" onClick={() => unsuspendMember(m)}>정지 해제</button>
                  ) : (
                    <button type="button" className="btn-delete" onClick={() => suspendMember(m)}>이용정지</button>
                  )}
                </span>
              )}
            </div>
          </article>
        ))
      )}

      {tab === 'notices' && (
        <>
          <section className="write-box">
            <h2>새 공지사항</h2>
            <form onSubmit={createNotice}>
              <div className="row"><input type="text" placeholder="제목" value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} /></div>
              <div className="row"><textarea placeholder="내용" value={noticeContent} onChange={e => setNoticeContent(e.target.value)} /></div>
              <div className="actions"><button className="btn-primary" type="submit">등록</button></div>
            </form>
          </section>
          {notices.map(n => (
            <article className="post" key={n.id}>
              <div className="post-top">
                <div className="post-title">
                  {n.is_pinned && <span className="post-category pinned">📌</span>}
                  {n.title}
                </div>
              </div>
              <div className="post-body">{n.content}</div>
              <div className="post-footer">
                <span />
                <span>
                  <button type="button" className="btn-delete" style={{ color: 'var(--accent)' }} onClick={() => toggleNoticePin(n)}>
                    {n.is_pinned ? '고정 해제' : '고정'}
                  </button>
                  <button type="button" className="btn-delete" onClick={() => deleteNotice(n.id)}>삭제</button>
                </span>
              </div>
            </article>
          ))}
        </>
      )}

      {tab === 'categories' && (
        <>
          <section className="write-box">
            <h2>새 카테고리</h2>
            <form onSubmit={addCategory}>
              <div className="row"><input type="text" placeholder="이름 (예: 유머)" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} /></div>
              <div className="row"><input type="text" placeholder="slug (예: humor, 영문/숫자/하이픈)" value={newCategorySlug} onChange={e => setNewCategorySlug(e.target.value)} /></div>
              <div className="actions"><button className="btn-primary" type="submit">추가</button></div>
            </form>
          </section>
          {categories.length === 0 ? <div className="empty">카테고리가 없습니다.</div> : categories.map(c => (
            <article className="post" key={c.id}>
              <div className="post-top">
                <div className="post-title">{c.name}</div>
                <div className="post-meta">{c.slug}</div>
              </div>
              <div className="post-footer">
                <span />
                <button type="button" className="btn-delete" onClick={() => deleteCategory(c)}>삭제</button>
              </div>
            </article>
          ))}
        </>
      )}

      {tab === 'banned' && (
        <>
          <section className="write-box">
            <h2>금칙어 추가</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
              등록된 단어가 포함된 게시글·댓글·롤링페이퍼 메시지는 서버에서 등록이 차단됩니다.
            </p>
            <form onSubmit={addBannedWord}>
              <div className="row"><input type="text" placeholder="금칙어 입력" value={newBannedWord} onChange={e => setNewBannedWord(e.target.value)} /></div>
              <div className="actions"><button className="btn-primary" type="submit">추가</button></div>
            </form>
          </section>
          {bannedWords.length === 0 ? <div className="empty">등록된 금칙어가 없습니다.</div> : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {bannedWords.map(bw => (
                <span key={bw.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '6px 12px', fontSize: 13 }}>
                  {bw.word}
                  <button type="button" className="link-btn" style={{ fontSize: 12 }} onClick={() => deleteBannedWord(bw)}>✕</button>
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'logs' && (
        logs.length === 0 ? <div className="empty">기록된 관리자 로그가 없습니다.</div> : logs.map(l => (
          <article className="post" key={l.id}>
            <div className="post-top">
              <div className="post-title">{LOG_ACTION_LABELS[l.action] || l.action}</div>
              <div className="post-meta">{formatDate(l.created_at)}</div>
            </div>
            <div className="post-footer">
              <span className="post-author">
                {logAdminNames[l.admin_id] || '관리자'} · {l.target_type} {l.target_id ? `#${l.target_id.slice(0, 8)}` : ''}
              </span>
            </div>
          </article>
        ))
      )}
    </>
  );
}
