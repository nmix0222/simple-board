import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';
import ReportButton from '../components/ReportButton.jsx';
import { formatDateTime as formatDate, excerpt } from '../lib/format.js';
import { TAGS, POST_COLORS } from '../lib/constants.js';
import { useDocumentMeta } from '../lib/useDocumentMeta.js';

const VIEWED_KEY = 'viewed-posts';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useSupabaseAuth();

  const [post, setPost] = useState(null);
  const [category, setCategory] = useState(null);
  const [author, setAuthor] = useState(null);
  const [myVote, setMyVote] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTag, setEditTag] = useState(TAGS[0]);
  const [editColor, setEditColor] = useState(POST_COLORS[0]);

  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [copied, setCopied] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  const canModify = post && user && (post.author_id === user.id || isAdmin);

  useDocumentMeta(post?.title, post?.content ? excerpt(post.content, 100) : undefined);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: p } = await supabase.from('posts').select('*').eq('id', id).single();
    if (!p || p.is_deleted) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setPost(p);
    setEditTitle(p.title);
    setEditContent(p.content);
    setEditTag(p.tag || TAGS[0]);
    setEditColor(p.color || POST_COLORS[0]);

    const { data: cat } = await supabase.from('categories').select('*').eq('id', p.category_id).single();
    setCategory(cat);
    const { data: prof } = await supabase.from('profiles').select('nickname').eq('id', p.author_id).single();
    setAuthor(prof);

    if (user) {
      const { data: vote } = await supabase.from('post_likes').select('value').eq('post_id', id).eq('user_id', user.id).maybeSingle();
      setMyVote(vote?.value || 0);
      const { data: bm } = await supabase.from('post_bookmarks').select('post_id').eq('post_id', id).eq('user_id', user.id).maybeSingle();
      setBookmarked(!!bm);
    }

    const { data: cmts } = await supabase.from('comments').select('*').eq('post_id', id).eq('is_deleted', false).order('created_at', { ascending: true });
    if (cmts?.length) {
      const authorIds = [...new Set(cmts.map(c => c.author_id))];
      const { data: profs } = await supabase.from('profiles').select('id, nickname').in('id', authorIds);
      const nameMap = Object.fromEntries((profs || []).map(pr => [pr.id, pr.nickname]));

      let likedByMe = new Set();
      if (user) {
        const { data: likes } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', cmts.map(c => c.id));
        likedByMe = new Set((likes || []).map(l => l.comment_id));
      }

      setComments(cmts.map(c => ({
        ...c,
        authorName: nameMap[c.author_id] || '알 수 없음',
        likedByMe: likedByMe.has(c.id)
      })));
    } else {
      setComments([]);
    }

    setLoading(false);

    try {
      const viewed = JSON.parse(sessionStorage.getItem(VIEWED_KEY) || '[]');
      if (!viewed.includes(id)) {
        viewed.push(id);
        sessionStorage.setItem(VIEWED_KEY, JSON.stringify(viewed));
        supabase.rpc('increment_post_view', { p_post_id: id });
      }
    } catch (e) { /* ignore */ }
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  async function handleVote(value) {
    if (!user) { alert('로그인 후 이용해주세요.'); return; }
    if (myVote === value) {
      await supabase.from('post_likes').delete().eq('post_id', id).eq('user_id', user.id);
      setMyVote(0);
    } else if (myVote === 0) {
      await supabase.from('post_likes').insert({ post_id: id, user_id: user.id, value });
      setMyVote(value);
    } else {
      await supabase.from('post_likes').update({ value }).eq('post_id', id).eq('user_id', user.id);
      setMyVote(value);
    }
    const { data: p } = await supabase.from('posts').select('like_count, dislike_count').eq('id', id).single();
    if (p) setPost(prev => ({ ...prev, ...p }));
  }

  async function handleBookmark() {
    if (!user) { alert('로그인 후 이용해주세요.'); return; }
    if (bookmarked) {
      await supabase.from('post_bookmarks').delete().eq('post_id', id).eq('user_id', user.id);
    } else {
      await supabase.from('post_bookmarks').insert({ post_id: id, user_id: user.id });
    }
    setBookmarked(!bookmarked);
  }

  function handleShare() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editTitle.trim() || !editContent.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }
    const { error } = await supabase.from('posts').update({
      title: editTitle.trim(), content: editContent.trim(), tag: editTag, color: editColor
    }).eq('id', id);
    if (error) { alert(error.message); return; }
    setEditing(false);
    load();
  }

  async function handleDelete() {
    if (isAdmin) {
      const typed = prompt(`이 작업은 되돌릴 수 없고 댓글도 함께 사라집니다.\n완전히 삭제하려면 제목을 그대로 입력해주세요: "${post.title}"`);
      if (typed !== post.title) {
        if (typed !== null) alert('제목이 일치하지 않아 삭제가 취소되었습니다.');
        return;
      }
      await supabase.from('posts').delete().eq('id', id);
      await supabase.rpc('log_admin_action', { p_action: 'hard_delete_post', p_target_type: 'post', p_target_id: id, p_detail: { title: post.title } });
    } else {
      if (!confirm('이 글을 삭제하시겠습니까?')) return;
      await supabase.from('posts').update({ is_deleted: true }).eq('id', id);
    }
    navigate('/');
  }

  async function submitComment(e, parentId = null) {
    e.preventDefault();
    const text = parentId ? replyText : commentText;
    if (!user) { alert('로그인 후 이용해주세요.'); return; }
    if (!text.trim()) { alert('내용을 입력해주세요.'); return; }
    const { error } = await supabase.from('comments').insert({
      post_id: id, author_id: user.id, content: text.trim(), parent_id: parentId
    });
    if (error) { alert(error.message); return; }
    if (parentId) { setReplyText(''); setReplyTo(null); } else { setCommentText(''); }
    load();
  }

  function startEditComment(c) {
    setEditingCommentId(c.id);
    setEditingCommentText(c.content);
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditingCommentText('');
  }

  async function saveEditComment(e, commentId) {
    e.preventDefault();
    if (!editingCommentText.trim()) { alert('내용을 입력해주세요.'); return; }
    const { error } = await supabase.from('comments').update({ content: editingCommentText.trim() }).eq('id', commentId);
    if (error) { alert(error.message); return; }
    cancelEditComment();
    load();
  }

  async function deleteComment(commentId, authorId) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    if (isAdmin) {
      await supabase.from('comments').delete().eq('id', commentId);
      if (user && authorId !== user.id) {
        await supabase.rpc('log_admin_action', { p_action: 'delete_comment', p_target_type: 'comment', p_target_id: commentId });
      }
    } else {
      await supabase.from('comments').update({ is_deleted: true }).eq('id', commentId);
    }
    load();
  }

  async function toggleCommentLike(commentId, currentlyLiked) {
    if (!user) { alert('로그인 후 이용해주세요.'); return; }
    if (currentlyLiked) {
      await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
    } else {
      await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id });
    }
    setComments(comments.map(c => c.id === commentId
      ? { ...c, likedByMe: !currentlyLiked, like_count: c.like_count + (currentlyLiked ? -1 : 1) }
      : c));
  }

  if (loading) return <div className="empty">불러오는 중...</div>;
  if (notFound) return <div className="empty">존재하지 않거나 삭제된 게시글입니다.</div>;

  const topLevel = comments.filter(c => !c.parent_id);
  const repliesOf = pid => comments.filter(c => c.parent_id === pid);

  if (editing) {
    return (
      <article className="post">
        <form onSubmit={saveEdit}>
          <div className="row">
            <select aria-label="태그" value={editTag} onChange={e => setEditTag(e.target.value)}>
              {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="row"><input type="text" aria-label="제목" value={editTitle} onChange={e => setEditTitle(e.target.value)} /></div>
          <div className="row"><textarea aria-label="내용" value={editContent} onChange={e => setEditContent(e.target.value)} /></div>
          <div className="row color-picker">
            {POST_COLORS.map((c, i) => (
              <button key={c} type="button" aria-label={`배경색 ${i + 1}`} aria-pressed={c === editColor} className={`color-swatch${c === editColor ? ' selected' : ''}`} style={{ background: c }} onClick={() => setEditColor(c)} />
            ))}
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
      {post.is_flagged && !isAdmin && (
        <div className="callout" style={{ marginBottom: 12, fontSize: 13 }}>
          🚩 여러 사용자의 신고가 접수되어 관리자 확인 전까지 다른 사용자에게는 이 글이 보이지 않습니다.
        </div>
      )}
      <article
        className={`post${post.color && post.color !== '#ffffff' ? ' post-colored' : ''}`}
        style={post.color && post.color !== '#ffffff' ? { background: post.color } : undefined}
      >
        <div className="post-top">
          <div className="post-title">
            {post.is_pinned && <span className="post-category pinned">📌 공지</span>}
            {post.tag && <span className="post-category">{post.tag}</span>}
            <span className="post-category">{category?.name}</span>
            {post.title}
          </div>
        </div>
        <div className="post-meta" style={{ marginBottom: 10 }}>
          <Link to={`/user/${post.author_id}`}>{author?.nickname || '알 수 없음'}</Link> · {formatDate(post.created_at)} · 조회 {post.view_count}
        </div>
        <div className="post-body">{post.content}</div>
        <div className="post-footer">
          <span className="post-author">
            <button type="button" className="reaction-btn" onClick={handleBookmark}>{bookmarked ? '★ 스크랩됨' : '☆ 스크랩'}</button>{' '}
            <button type="button" className="reaction-btn" onClick={handleShare}>{copied ? '복사됨!' : '🔗 공유'}</button>{' '}
            <ReportButton targetType="post" targetId={post.id} />
          </span>
          {canModify && (
            <span>
              <button type="button" className="btn-delete" onClick={() => setEditing(true)} style={{ color: 'var(--accent)' }}>수정</button>
              <button type="button" className="btn-delete" onClick={handleDelete}>삭제</button>
            </span>
          )}
        </div>
        <div className="reaction-bar">
          <button type="button" className="reaction-btn" onClick={() => handleVote(1)} style={myVote === 1 ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}>
            👍 추천 {post.like_count}
          </button>
          <button type="button" className="reaction-btn" onClick={() => handleVote(-1)} style={myVote === -1 ? { borderColor: 'var(--danger)', color: 'var(--danger)' } : undefined}>
            👎 비추천 {post.dislike_count}
          </button>
        </div>
      </article>

      <div className="comment-section" style={{ border: 'none', paddingTop: 0 }}>
        <h3 style={{ fontSize: 15, margin: '0 0 10px' }}>댓글 {comments.length}</h3>
        {topLevel.length === 0 && <div className="comment-loading">아직 댓글이 없습니다.</div>}
        {topLevel.map(c => (
          <div key={c.id}>
            <div className="comment-item">
              {editingCommentId === c.id ? (
                <form onSubmit={e => saveEditComment(e, c.id)} style={{ display: 'flex', gap: 6 }}>
                  <input type="text" aria-label="댓글 수정" value={editingCommentText} onChange={e => setEditingCommentText(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn-primary" type="submit" style={{ width: 'auto' }}>저장</button>
                  <button type="button" className="btn-secondary" style={{ width: 'auto' }} onClick={cancelEditComment}>취소</button>
                </form>
              ) : (
                <>
                  <span className="comment-author">{c.authorName}</span>
                  {c.content}
                  <button
                    type="button"
                    className="link-btn"
                    style={{ marginLeft: 8, color: c.likedByMe ? '#e0245e' : undefined }}
                    onClick={() => toggleCommentLike(c.id, c.likedByMe)}
                  >
                    {c.likedByMe ? '❤️' : '🤍'} {c.like_count || 0}
                  </button>
                  <button type="button" className="link-btn" style={{ marginLeft: 8 }} onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>답글</button>
                  {user && user.id === c.author_id && (
                    <button type="button" className="link-btn" style={{ marginLeft: 8 }} onClick={() => startEditComment(c)}>수정</button>
                  )}
                  {user && (user.id === c.author_id || isAdmin) && (
                    <button type="button" className="link-btn" style={{ marginLeft: 8, color: 'var(--danger)' }} onClick={() => deleteComment(c.id, c.author_id)}>삭제</button>
                  )}
                </>
              )}
            </div>
            {repliesOf(c.id).map(r => (
              <div className="comment-item" key={r.id} style={{ marginLeft: 24 }}>
                {editingCommentId === r.id ? (
                  <form onSubmit={e => saveEditComment(e, r.id)} style={{ display: 'flex', gap: 6 }}>
                    <input type="text" aria-label="댓글 수정" value={editingCommentText} onChange={e => setEditingCommentText(e.target.value)} style={{ flex: 1 }} />
                    <button className="btn-primary" type="submit" style={{ width: 'auto' }}>저장</button>
                    <button type="button" className="btn-secondary" style={{ width: 'auto' }} onClick={cancelEditComment}>취소</button>
                  </form>
                ) : (
                  <>
                    <span className="comment-author">↳ {r.authorName}</span>
                    {r.content}
                    <button
                      type="button"
                      className="link-btn"
                      style={{ marginLeft: 8, color: r.likedByMe ? '#e0245e' : undefined }}
                      onClick={() => toggleCommentLike(r.id, r.likedByMe)}
                    >
                      {r.likedByMe ? '❤️' : '🤍'} {r.like_count || 0}
                    </button>
                    {user && user.id === r.author_id && (
                      <button type="button" className="link-btn" style={{ marginLeft: 8 }} onClick={() => startEditComment(r)}>수정</button>
                    )}
                    {user && (user.id === r.author_id || isAdmin) && (
                      <button type="button" className="link-btn" style={{ marginLeft: 8, color: 'var(--danger)' }} onClick={() => deleteComment(r.id, r.author_id)}>삭제</button>
                    )}
                  </>
                )}
              </div>
            ))}
            {replyTo === c.id && (
              <form className="comment-form" style={{ marginLeft: 24 }} onSubmit={e => submitComment(e, c.id)}>
                <input type="text" aria-label="답글" placeholder="답글을 입력하세요" value={replyText} onChange={e => setReplyText(e.target.value)} />
                <button className="btn-primary" type="submit">등록</button>
              </form>
            )}
          </div>
        ))}
        <form className="comment-form" onSubmit={e => submitComment(e)}>
          <input type="text" aria-label="댓글" placeholder={user ? '댓글을 입력하세요' : '로그인 후 댓글을 작성할 수 있습니다'} value={commentText} onChange={e => setCommentText(e.target.value)} disabled={!user} />
          <button className="btn-primary" type="submit" disabled={!user}>등록</button>
        </form>
      </div>
    </>
  );
}
