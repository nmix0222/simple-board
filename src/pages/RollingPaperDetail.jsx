import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';
import { formatDateTime as formatDate } from '../lib/format.js';
import { useDocumentMeta } from '../lib/useDocumentMeta.js';

const CARD_COLORS = ['#fff4cc', '#ffe0e6', '#dbeafe', '#dcfce7', '#f3e8ff', '#ffedd5'];

// 졸업식 날 선생님께 드리는 5개 롤링페이퍼에만 축하 연출(색종이, 배경음악, 코르크보드 느낌)을 적용한다.
const GRADUATION_PAPER_IDS = new Set([
  '5dcc2fd1-9f7e-4ac2-997f-5d0004e97963',
  '2141d98f-bff6-4d6b-9590-fce705ca58bb',
  '5762e3a0-a92f-418e-b436-daf8ae0c64ed',
  'f0484365-7144-47fa-ad58-8ab033ca3fce',
  'f87bb8e5-8a09-4e56-8ac0-668c1d7ddc9d'
]);

function fireConfetti() {
  import('canvas-confetti').then(({ default: confetti }) => {
    const duration = 2200;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors: ['#ffb703', '#fb8500', '#8ecae6', '#ffafcc'] });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors: ['#ffb703', '#fb8500', '#8ecae6', '#ffafcc'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  });
}

export default function RollingPaperDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useSupabaseAuth();
  const [searchParams] = useSearchParams();
  const wallRef = useRef(null);
  const qrCanvasRef = useRef(null);
  const audioRef = useRef(null);
  const isGraduation = GRADUATION_PAPER_IDS.has(id);
  const [musicPlaying, setMusicPlaying] = useState(false);

  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [error, setError] = useState('');
  const [messages, setMessages] = useState(null);
  const [msgName, setMsgName] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [msgAnonymous, setMsgAnonymous] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [openReplyId, setOpenReplyId] = useState(null);
  const [replyName, setReplyName] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessageContent, setEditingMessageContent] = useState('');
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editingReplyContent, setEditingReplyContent] = useState('');

  useDocumentMeta(paper?.title, paper?.description || '롤링페이퍼에 마음을 담은 메시지를 남겨보세요.');

  useEffect(() => {
    setLoading(true);
    setUnlocked(false);
    setPaper(null);
    setMessages(null);
    setError('');
    const prefill = searchParams.get('pk') || '';
    setPasskeyInput(prefill);

    supabase.from('rolling_papers_public').select('*').eq('id', id).single().then(async ({ data }) => {
      setPaper(data || null);
      setLoading(false);
      if (!data) return;
      if (data.visibility === 'public' || isAdmin) {
        setUnlocked(true);
        return;
      }
      if (prefill) {
        const { data: ok } = await supabase.rpc('verify_rolling_paper_passkey', { p_paper_id: id, p_passkey: prefill.trim().toUpperCase() });
        if (ok) setUnlocked(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAdmin]);

  useEffect(() => {
    if (!unlocked) return;
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, id]);

  useEffect(() => {
    if (!unlocked || !isGraduation) return;
    fireConfetti();
    if (audioRef.current) {
      audioRef.current.play().then(() => setMusicPlaying(true)).catch(() => setMusicPlaying(false));
    }
  }, [unlocked, isGraduation]);

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  function toggleMusic() {
    if (!audioRef.current) return;
    if (musicPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setMusicPlaying(p => !p);
  }

  useEffect(() => {
    if (!showQr || !qrCanvasRef.current || !paper) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}#/paper/${id}?pk=${encodeURIComponent(passkeyInput.trim().toUpperCase())}`;
    import('qrcode').then(({ default: QRCode }) => {
      if (qrCanvasRef.current) QRCode.toCanvas(qrCanvasRef.current, shareUrl, { width: 200, margin: 1 }).catch(() => {});
    });
  }, [showQr, paper, id, passkeyInput]);

  async function loadMessages() {
    const { data } = await supabase
      .from('rolling_paper_messages_public')
      .select('*')
      .eq('rolling_paper_id', id)
      .order('created_at', { ascending: true });
    const rows = data || [];
    const authorIds = [...new Set(rows.map(m => m.author_id).filter(Boolean))];

    let commentsByMessage = {};
    if (rows.length) {
      const { data: comments } = await supabase
        .from('rolling_paper_message_comments_public')
        .select('*')
        .in('message_id', rows.map(m => m.id))
        .order('created_at', { ascending: true });
      const commentAuthorIds = [...new Set((comments || []).map(c => c.author_id).filter(Boolean))];
      let commentNameMap = {};
      if (commentAuthorIds.length) {
        const { data: cProfs } = await supabase.from('profiles').select('id, nickname').in('id', commentAuthorIds);
        commentNameMap = Object.fromEntries((cProfs || []).map(p => [p.id, p.nickname]));
      }
      for (const c of comments || []) {
        const name = c.is_anonymous ? '익명' : (c.display_name || commentNameMap[c.author_id] || '알 수 없음');
        (commentsByMessage[c.message_id] ||= []).push({ ...c, authorName: name });
      }
    }

    let nameMap = {};
    if (authorIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, nickname').in('id', authorIds);
      nameMap = Object.fromEntries((profs || []).map(p => [p.id, p.nickname]));
    }

    let likeCounts = {};
    let likedByMe = new Set();
    if (rows.length) {
      const { data: reactions } = await supabase
        .from('rolling_paper_reactions')
        .select('message_id, user_id')
        .in('message_id', rows.map(m => m.id));
      for (const r of reactions || []) {
        likeCounts[r.message_id] = (likeCounts[r.message_id] || 0) + 1;
        if (user && r.user_id === user.id) likedByMe.add(r.message_id);
      }
    }

    setMessages(rows.map(m => ({
      ...m,
      authorName: m.is_anonymous ? '익명' : (m.display_name || nameMap[m.author_id] || '알 수 없음'),
      comments: commentsByMessage[m.id] || [],
      likeCount: likeCounts[m.id] || 0,
      likedByMe: likedByMe.has(m.id)
    })));
  }

  async function toggleLike(messageId, currentlyLiked) {
    if (!user) { alert('로그인 후 이용해주세요.'); return; }
    if (currentlyLiked) {
      await supabase.from('rolling_paper_reactions').delete().eq('message_id', messageId).eq('user_id', user.id);
    } else {
      await supabase.from('rolling_paper_reactions').insert({ message_id: messageId, user_id: user.id });
    }
    loadMessages();
  }

  async function submitReply(e, messageId) {
    e.preventDefault();
    if (!user) { alert('로그인 후 이용해주세요.'); return; }
    if (!replyAnonymous && !replyName.trim()) { alert('이름을 입력해주세요.'); return; }
    if (!replyText.trim()) { alert('답장 내용을 입력해주세요.'); return; }
    const { error: err } = await supabase.from('rolling_paper_message_comments').insert({
      message_id: messageId,
      author_id: user.id,
      display_name: replyAnonymous ? null : replyName.trim(),
      is_anonymous: replyAnonymous,
      content: replyText.trim()
    });
    if (err) { alert(err.message); return; }
    setReplyText('');
    loadMessages();
  }

  function startEditMessage(m) {
    setEditingMessageId(m.id);
    setEditingMessageContent(m.content);
  }

  function cancelEditMessage() {
    setEditingMessageId(null);
    setEditingMessageContent('');
  }

  async function saveEditMessage(e, messageId) {
    e.preventDefault();
    if (!editingMessageContent.trim()) { alert('내용을 입력해주세요.'); return; }
    const { error: err } = await supabase.from('rolling_paper_messages').update({ content: editingMessageContent.trim() }).eq('id', messageId);
    if (err) { alert(err.message); return; }
    cancelEditMessage();
    loadMessages();
  }

  async function deleteMessage(messageId) {
    if (!confirm('이 메시지를 삭제하시겠습니까?')) return;
    if (isAdmin) {
      await supabase.from('rolling_paper_messages').delete().eq('id', messageId);
    } else {
      await supabase.from('rolling_paper_messages').update({ is_deleted: true }).eq('id', messageId);
    }
    loadMessages();
  }

  function startEditReply(c) {
    setEditingReplyId(c.id);
    setEditingReplyContent(c.content);
  }

  function cancelEditReply() {
    setEditingReplyId(null);
    setEditingReplyContent('');
  }

  async function saveEditReply(e, replyId) {
    e.preventDefault();
    if (!editingReplyContent.trim()) { alert('내용을 입력해주세요.'); return; }
    const { error: err } = await supabase.from('rolling_paper_message_comments').update({ content: editingReplyContent.trim() }).eq('id', replyId);
    if (err) { alert(err.message); return; }
    cancelEditReply();
    loadMessages();
  }

  async function deleteReply(replyId) {
    if (!confirm('답장을 삭제하시겠습니까?')) return;
    await supabase.from('rolling_paper_message_comments').delete().eq('id', replyId);
    loadMessages();
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
    if (!msgAnonymous && !msgName.trim()) { alert('이름을 입력해주세요.'); return; }
    if (!msgContent.trim()) { alert('메시지 내용을 입력해주세요.'); return; }
    const { error: err } = await supabase.rpc('post_rolling_paper_message', {
      p_paper_id: id,
      p_content: msgContent.trim(),
      p_is_anonymous: msgAnonymous,
      p_display_name: msgAnonymous ? null : msgName.trim(),
      p_passkey: paper.visibility === 'passkey' ? passkeyInput.trim().toUpperCase() : null
    });
    if (err) { alert(err.message); return; }
    setMsgName('');
    setMsgContent('');
    loadMessages();
    if (isGraduation) fireConfetti();
  }

  async function handleDeletePaper() {
    if (!confirm('이 롤링페이퍼를 삭제하시겠습니까?')) return;
    const { error: err } = isAdmin
      ? await supabase.from('rolling_papers').delete().eq('id', id)
      : await supabase.from('rolling_papers').update({ is_deleted: true }).eq('id', id);
    if (err) {
      alert('삭제에 실패했습니다: ' + err.message);
      return;
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

  async function handleExportPdf() {
    if (!wallRef.current) return;
    setExporting(true);
    setPrintMode(true);
    // 코르크보드 나무질감/기울어진 카드 스타일이 사라진 상태로 다시 그려질 때까지 한 프레임 기다린다.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);
      const canvas = await html2canvas(wallRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.setFontSize(16);
      pdf.text(paper.title, 20, 30);
      pdf.addImage(imgData, 'PNG', 20, 45, imgWidth, imgHeight);
      pdf.save(`${paper.title}.pdf`);
    } catch (e) {
      alert('PDF 생성에 실패했습니다: ' + e.message);
    } finally {
      setExporting(false);
      setPrintMode(false);
    }
  }

  if (loading) return <div className="empty">불러오는 중...</div>;
  if (!paper) return <div className="empty">존재하지 않는 롤링페이퍼입니다.</div>;

  const canModify = user && (paper.creator_id === user.id || isAdmin);
  const expired = paper.deadline && new Date() > new Date(paper.deadline);

  if (editing) {
    return (
      <article className="post">
        <form onSubmit={saveEdit}>
          <div className="row"><input type="text" aria-label="제목" placeholder="제목" value={editTitle} onChange={e => setEditTitle(e.target.value)} /></div>
          <div className="row"><textarea aria-label="소개글" placeholder="소개글 (선택)" value={editDescription} onChange={e => setEditDescription(e.target.value)} /></div>
          <div className="row">
            <input type="datetime-local" aria-label="마감일" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} title="마감일 (선택)" />
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
      {isGraduation && <audio ref={audioRef} src={`${import.meta.env.BASE_URL}bgm.mp3`} loop />}

      <div className={`wall-header${isGraduation ? ' wall-header-graduation' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{isGraduation ? '🎓 ' : ''}{paper.title}</div>
          {isAdmin && <div style={{ fontSize: 12, color: 'var(--muted)' }}>관리자 권한으로 접근 중</div>}
          {paper.deadline && <div style={{ fontSize: 12, color: 'var(--muted)' }}>마감 {formatDate(paper.deadline)}</div>}
        </div>
        <span style={{ display: 'flex', gap: 4 }}>
          {isGraduation && unlocked && (
            <button type="button" className="btn-secondary" onClick={toggleMusic} style={{ width: 'auto' }}>
              {musicPlaying ? '🔇 음악 끄기' : '🎵 음악 재생'}
            </button>
          )}
          {canModify && (
            <>
              <button type="button" className="btn-delete" style={{ color: 'var(--accent)' }} onClick={startEdit}>수정</button>
              <button type="button" className="btn-delete" onClick={handleDeletePaper}>삭제</button>
            </>
          )}
        </span>
      </div>

      {paper.description && <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>{paper.description}</p>}

      {!unlocked ? (
        <form className="comment-form" onSubmit={handleUnlock}>
          <input type="text" aria-label="패스키" placeholder="패스키 입력" value={passkeyInput} onChange={e => setPasskeyInput(e.target.value)} />
          <button className="btn-primary" type="submit">입장</button>
        </form>
      ) : (
        <>
          {!expired && (
            <section className="write-box">
              <h2>메시지 남기기</h2>
              <form onSubmit={handleAddMessage}>
                {!msgAnonymous && (
                  <div className="row">
                    <input type="text" aria-label="이름" placeholder="학번 이름 (예: 0315 홍길동)" value={msgName} onChange={e => setMsgName(e.target.value)} style={{ maxWidth: 200 }} />
                  </div>
                )}
                <div className="row">
                  <textarea aria-label="메시지 내용" placeholder="따뜻한 메시지를 남겨주세요" value={msgContent} onChange={e => setMsgContent(e.target.value)} />
                </div>
                {paper.allow_anonymous && (
                  <label style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                    <input type="checkbox" aria-label="익명으로 작성하기" checked={msgAnonymous} onChange={e => setMsgAnonymous(e.target.checked)} style={{ width: 'auto' }} />
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

          <div className="row" style={{ gap: 8, marginBottom: 4 }}>
            <button type="button" className="btn-secondary" onClick={() => setShowQr(s => !s)} style={{ width: 'auto' }}>
              {showQr ? 'QR코드 닫기' : '📱 QR코드로 공유'}
            </button>
            <button type="button" className="btn-secondary" onClick={handleExportPdf} disabled={exporting} style={{ width: 'auto' }}>
              {exporting ? '생성 중...' : '📄 PDF로 저장'}
            </button>
          </div>
          {showQr && (
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16 }}>
              <canvas ref={qrCanvasRef} />
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>이 QR코드를 스캔하면 패스키 입력 없이 바로 들어올 수 있어요.</div>
            </div>
          )}

          <div className={`message-wall${isGraduation && !printMode ? ' corkboard' : ''}`} ref={wallRef}>
            {messages === null ? null : messages.length === 0 ? (
              <div className="empty">아직 남겨진 메시지가 없습니다.</div>
            ) : (
              messages.map((m, i) => (
                <div
                  className={`message-card${isGraduation && !printMode ? ' pinned-note' : ''}`}
                  style={{ background: CARD_COLORS[i % CARD_COLORS.length], '--tilt': printMode ? '0deg' : `${((i * 37) % 9) - 4}deg` }}
                  key={m.id}
                >
                  {isGraduation && !printMode && <span className="pin-dot" aria-hidden="true">📌</span>}
                  {editingMessageId === m.id ? (
                    <form onSubmit={e => saveEditMessage(e, m.id)}>
                      <textarea
                        aria-label="메시지 수정"
                        value={editingMessageContent}
                        onChange={e => setEditingMessageContent(e.target.value)}
                        style={{ width: '100%', minHeight: 60, fontSize: 13 }}
                      />
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <button className="btn-primary" type="submit" style={{ width: 'auto', padding: '4px 12px', fontSize: 12 }}>저장</button>
                        <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '4px 12px', fontSize: 12 }} onClick={cancelEditMessage}>취소</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="message-author">{m.authorName}</div>
                      <div className="message-content">{m.content}</div>
                    </>
                  )}
                  {!printMode && editingMessageId !== m.id && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="link-btn"
                        style={{ fontSize: 11, color: m.likedByMe ? '#e0245e' : 'inherit', opacity: m.likedByMe ? 1 : 0.75 }}
                        onClick={() => toggleLike(m.id, m.likedByMe)}
                      >
                        {m.likedByMe ? '❤️' : '🤍'} {m.likeCount}
                      </button>
                      <button
                        type="button"
                        className="link-btn"
                        style={{ fontSize: 11, color: 'inherit', opacity: 0.75 }}
                        onClick={() => setOpenReplyId(openReplyId === m.id ? null : m.id)}
                      >
                        💬 답장 {m.comments.length}
                      </button>
                      {user && user.id === m.author_id && (
                        <button type="button" className="link-btn" style={{ fontSize: 11, opacity: 0.75 }} onClick={() => startEditMessage(m)}>수정</button>
                      )}
                      {user && (user.id === m.author_id || isAdmin) && (
                        <button type="button" className="link-btn" style={{ fontSize: 11, color: 'var(--danger)', opacity: 0.75 }} onClick={() => deleteMessage(m.id)}>삭제</button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {!printMode && openReplyId && messages && (() => {
            const target = messages.find(m => m.id === openReplyId);
            if (!target) return null;
            return (
              <div className="comment-section" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginTop: 14 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                  <strong style={{ color: 'var(--text)' }}>{target.authorName}</strong>님의 메시지에 답장
                </div>
                {target.comments.length === 0 ? (
                  <div className="comment-loading">아직 답장이 없습니다.</div>
                ) : (
                  target.comments.map(c => (
                    <div className="comment-item" key={c.id}>
                      {editingReplyId === c.id ? (
                        <form onSubmit={e => saveEditReply(e, c.id)} style={{ display: 'flex', gap: 6 }}>
                          <input type="text" aria-label="답장 수정" value={editingReplyContent} onChange={e => setEditingReplyContent(e.target.value)} style={{ flex: 1 }} />
                          <button className="btn-primary" type="submit" style={{ width: 'auto' }}>저장</button>
                          <button type="button" className="btn-secondary" style={{ width: 'auto' }} onClick={cancelEditReply}>취소</button>
                        </form>
                      ) : (
                        <>
                          <span className="comment-author">{c.authorName}</span>
                          {c.content}
                          {user && user.id === c.author_id && (
                            <button type="button" className="link-btn" style={{ marginLeft: 8 }} onClick={() => startEditReply(c)}>수정</button>
                          )}
                          {user && (user.id === c.author_id || isAdmin) && (
                            <button type="button" className="link-btn" style={{ marginLeft: 8, color: 'var(--danger)' }} onClick={() => deleteReply(c.id)}>삭제</button>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )}
                <form onSubmit={e => submitReply(e, openReplyId)} style={{ marginTop: 10 }}>
                  {!replyAnonymous && (
                    <div className="row">
                      <input type="text" aria-label="이름" placeholder="이름 (예: 김민수 선생님)" value={replyName} onChange={e => setReplyName(e.target.value)} style={{ maxWidth: 200 }} />
                    </div>
                  )}
                  <div className="row">
                    <input type="text" aria-label="답장" placeholder="답장을 입력하세요" value={replyText} onChange={e => setReplyText(e.target.value)} />
                  </div>
                  <label style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                    <input type="checkbox" aria-label="익명으로 답장하기" checked={replyAnonymous} onChange={e => setReplyAnonymous(e.target.checked)} style={{ width: 'auto' }} />
                    익명으로 답장하기
                  </label>
                  <div className="actions">
                    <button className="btn-primary" type="submit">답장 보내기</button>
                  </div>
                </form>
              </div>
            );
          })()}
        </>
      )}
      {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{error}</div>}
    </>
  );
}
