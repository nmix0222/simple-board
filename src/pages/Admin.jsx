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

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'posts') {
      supabase.from('posts').select('*').order('created_at', { ascending: false }).then(({ data }) => setPosts(data || []));
    } else {
      supabase.from('reports').select('*').order('created_at', { ascending: false }).then(({ data }) => setReports(data || []));
    }
  }, [isAdmin, tab]);

  async function togglePin(post) {
    await supabase.from('posts').update({ is_pinned: !post.is_pinned }).eq('id', post.id);
    setPosts(posts.map(p => p.id === post.id ? { ...p, is_pinned: !p.is_pinned } : p));
  }

  async function hardDelete(post) {
    if (!confirm('완전히 삭제하시겠습니까?')) return;
    await supabase.from('posts').delete().eq('id', post.id);
    setPosts(posts.filter(p => p.id !== post.id));
  }

  async function updateReportStatus(report, status) {
    await supabase.from('reports').update({ status }).eq('id', report.id);
    await supabase.from('report_actions').insert({
      report_id: report.id,
      admin_id: user.id,
      action: status === 'resolved' ? 'delete_content' : status === 'dismissed' ? 'dismiss' : 'deferred'
    });
    setReports(reports.map(r => r.id === report.id ? { ...r, status } : r));
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
                <button type="button" className="btn-delete" style={{ color: 'var(--accent)' }} onClick={() => updateReportStatus(r, 'reviewing')}>검토중</button>
                <button type="button" className="btn-delete" style={{ color: 'var(--accent)' }} onClick={() => updateReportStatus(r, 'resolved')}>완료 처리</button>
                <button type="button" className="btn-delete" onClick={() => updateReportStatus(r, 'dismissed')}>기각</button>
              </span>
            </div>
          </article>
        ))
      )}
    </>
  );
}
