import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';

const REASON_LABELS = {
  abuse: '욕설', defamation: '악의적인 비방', sexual: '성적인 콘텐츠',
  privacy: '개인정보 노출', spam: '스팸', other: '기타'
};
const STATUS_LABELS = { pending: '대기', reviewing: '검토중', resolved: '완료', dismissed: '기각' };

export default function Admin() {
  const { user, profile, isAdmin, loading } = useSupabaseAuth();
  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [notices, setNotices] = useState([]);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'posts') {
      supabase.from('posts').select('*').order('created_at', { ascending: false }).then(({ data }) => setPosts(data || []));
    } else if (tab === 'reports') {
      supabase.from('reports').select('*').order('created_at', { ascending: false }).then(({ data }) => setReports(data || []));
    } else if (tab === 'notices') {
      loadNotices();
    }
  }, [isAdmin, tab]);

  async function loadNotices() {
    const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
    setNotices(data || []);
  }

  async function createNotice(e) {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;
    await supabase.from('notices').insert({ author_id: user.id, title: noticeTitle.trim(), content: noticeContent.trim() });
    setNoticeTitle('');
    setNoticeContent('');
    loadNotices();
  }

  async function deleteNotice(id) {
    if (!confirm('공지사항을 삭제하시겠습니까?')) return;
    await supabase.from('notices').delete().eq('id', id);
    loadNotices();
  }

  async function togglePin(post) {
    await supabase.from('posts').update({ is_pinned: !post.is_pinned }).eq('id', post.id);
    setPosts(posts.map(p => p.id === post.id ? { ...p, is_pinned: !p.is_pinned } : p));
  }

  async function hardDelete(post) {
    if (!confirm('완전히 삭제하시겠습니까?')) return;
    await supabase.from('posts').delete().eq('id', post.id);
    setPosts(posts.filter(p => p.id !== post.id));
  }

  async function logAction(report, status, action) {
    await supabase.from('reports').update({ status }).eq('id', report.id);
    await supabase.from('report_actions').insert({ report_id: report.id, admin_id: user.id, action });
    setReports(reports.map(r => r.id === report.id ? { ...r, status } : r));
  }

  async function deleteReportedContent(report) {
    if (!confirm('신고된 콘텐츠를 삭제하시겠습니까?')) return;
    const table = { post: 'posts', comment: 'comments', rolling_paper: 'rolling_papers', rolling_paper_message: 'rolling_paper_messages' }[report.target_type];
    if (table) await supabase.from(table).delete().eq('id', report.target_id);
    await logAction(report, 'resolved', 'delete_content');
  }

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
      <div className="tabs">
        <button type="button" className={`tab${tab === 'posts' ? ' active' : ''}`} onClick={() => setTab('posts')}>게시글 관리</button>
        <button type="button" className={`tab${tab === 'reports' ? ' active' : ''}`} onClick={() => setTab('reports')}>신고 관리</button>
        <button type="button" className={`tab${tab === 'notices' ? ' active' : ''}`} onClick={() => setTab('notices')}>공지사항 관리</button>
      </div>

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
              <div className="post-top"><div className="post-title">{n.title}</div></div>
              <div className="post-body">{n.content}</div>
              <div className="post-footer">
                <span />
                <button type="button" className="btn-delete" onClick={() => deleteNotice(n.id)}>삭제</button>
              </div>
            </article>
          ))}
        </>
      )}
    </>
  );
}
