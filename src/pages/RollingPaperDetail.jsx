import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';
import { formatDateTime as formatDate } from '../lib/format.js';

const CARD_COLORS = ['#fff4cc', '#ffe0e6', '#dbeafe', '#dcfce7', '#f3e8ff', '#ffedd5'];

export default function RollingPaperDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useSupabaseAuth();

  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [error, setError] = useState('');
  const [messages, setMessages] = useState(null);
  const [msgContent, setMsgContent] = useState('');
  const [msgAnonymous, setMsgAnonymous] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDeadline, setEditDeadline] = useState('');

  useEffect(() => {
    setLoading(true);
    setUnlocked(false);
    setPaper(null);
    setMessages(null);
    setPasskeyInput('');
    setError('');
    supabase.from('rolling_papers_public').select('*').eq('id', id).single().then(({ data }) => {
      setPaper(data || null);
      setLoading(false);
      if (data && (data.visibility === 'public' || isAdmin)) {
        setUnlocked(true);
      }
    });
  }, [id, isAdmin]);

  useEffect(() => {
    if (!unlocked) return;
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, id]);

  async function loadMessages() {
    const { data } = await supabase
      .from('rolling_paper_messages_public')
      .select('*')
      .eq('rolling_paper_id', id)
      .order('created_at', { ascending: true });
    const rows = data || [];
    const authorIds = [...new Set(rows.map(m => m.author_id).filter(Boolean))];
    let nameMap = {};
    if (authorIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, nickname').in('id', authorIds);
      nameMap = Object.fromEntries((profs || []).map(p => [p.id, p.nickname]));
    }
    setMessages(rows.map(m => ({ ...m, authorName: m.is_anonymous ? '익명' : (nameMap[m.author_id] || '알 수 없음') })));
  }

  async function handleUnlock(e) {
    e.preventDefault();
    setError('');
    const { data } = await supabase.rpc('verify_rolling_paper_passkey', { p_paper_id: id, p_passkey: passkeyInput.trim().toUpperCase() });
    if (!data) {
      setError('패스키가 올바르지 않습니다.');
      return;
    }
    setUnlocked(true);
  }

  async function handleAddMessage(e) {
    e.preventDefault();
    if (!user) { alert('로그인 후 이용해주세요.'); return; }
    if (!msgContent.trim()) { alert('메시지 내용을 입력해주세요.'); return; }
    const { error: err } = await supabase.rpc('post_rolling_paper_message', {
      p_paper_id: id,
      p_content: msgContent.trim(),
      p_is_anonymous: msgAnonymous,
      p_passkey: paper.visibility === 'passkey' ? passkeyInput.trim().toUpperCase() : null
    });
    if (err) { alert(err.message); return; }
    setMsgContent('');
    loadMessages();
  }

  async function handleDeletePaper() {
    if (!confirm('이 롤링페이퍼를 삭제하시겠습니까?')) return;
    if (isAdmin) {
      await supabase.from('rolling_papers').delete().eq('id', id);
    } else {
      await supabase.from('rolling_papers').update({ is_deleted: true }).eq('id', id);
    }
    navigate('/');
  }

  function startEdit() {
    setEditTitle(paper.title);
    setEditDescription(paper.description || '');
    setEditDeadline(paper.deadline ? paper.deadline.slice(0, 16) : '');
    setEditing(true);
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editTitle.trim()) { alert('제목을 입력해주세요.'); return; }
    const { error: err } = await supabase.from('rolling_papers').update({
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      deadline: editDeadline ? new Date(editDeadline).toISOString() : null
    }).eq('id', id);
    if (err) { alert(err.message); return; }
    setEditing(false);
    const { data } = await supabase.from('rolling_papers_public').select('*').eq('id', id).single();
    setPaper(data || null);
  }

  if (loading) return <div className="empty">불러오는 중...</div>;
  if (!paper) return <div className="empty">존재하지 않는 롤링페이퍼입니다.</div>;

  const canModify = user && (paper.creator_id === user.id || isAdmin);
  const expired = paper.deadline && new Date() > new Date(paper.deadline);

  if (editing) {
    return (
      <article className="post">
        <form onSubmit={saveEdit}>
          <div className="row"><input type="text" placeholder="제목" value={editTitle} onChange={e => setEditTitle(e.target.value)} /></div>
          <div className="row"><textarea placeholder="소개글 (선택)" value={editDescription} onChange={e => setEditDescription(e.target.value)} /></div>
          <div className="row">
            <input type="datetime-local" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} title="마감일 (선택)" />
          </div>
          <div className="actions" style={{ gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>취소</button>
            <button type="submit" className="btn-primary">저장</button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <>
      <div className="wall-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{paper.title}</div>
          {isAdmin && <div style={{ fontSize: 12, color: 'var(--muted)' }}>관리자 권한으로 접근 중</div>}
          {paper.deadline && <div style={{ fontSize: 12, color: 'var(--muted)' }}>마감 {formatDate(paper.deadline)}</div>}
        </div>
        {canModify && (
          <span>
            <button type="button" className="btn-delete" style={{ color: 'var(--accent)' }} onClick={startEdit}>수정</button>
            <button type="button" className="btn-delete" onClick={handleDeletePaper}>삭제</button>
          </span>
        )}
      </div>

      {paper.description && <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>{paper.description}</p>}

      {!unlocked ? (
        <form className="comment-form" onSubmit={handleUnlock}>
          <input type="text" placeholder="패스키 입력" value={passkeyInput} onChange={e => setPasskeyInput(e.target.value)} />
          <button className="btn-primary" type="submit">입장</button>
        </form>
      ) : (
        <>
          {!expired && (
            <section className="write-box">
              <h2>메시지 남기기</h2>
              <form onSubmit={handleAddMessage}>
                <div className="row">
                  <textarea placeholder="따뜻한 메시지를 남겨주세요" value={msgContent} onChange={e => setMsgContent(e.target.value)} />
                </div>
                {paper.allow_anonymous && (
                  <label style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                    <input type="checkbox" checked={msgAnonymous} onChange={e => setMsgAnonymous(e.target.checked)} style={{ width: 'auto' }} />
                    익명으로 남기기
                  </label>
                )}
                <div className="actions">
                  <button className="btn-primary" type="submit" disabled={!user}>남기기</button>
                </div>
              </form>
            </section>
          )}
          {expired && <div className="callout" style={{ marginBottom: 16, fontSize: 13, color: 'var(--muted)' }}>마감된 롤링페이퍼입니다. 더 이상 메시지를 남길 수 없습니다.</div>}

          <div className="message-wall">
            {messages === null ? null : messages.length === 0 ? (
              <div className="empty">아직 남겨진 메시지가 없습니다.</div>
            ) : (
              messages.map((m, i) => (
                <div className="message-card" style={{ background: CARD_COLORS[i % CARD_COLORS.length] }} key={m.id}>
                  <div className="message-author">{m.authorName}</div>
                  <div className="message-content">{m.content}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}
      {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{error}</div>}
    </>
  );
}
