import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';

const TYPE_LABEL = {
  post_comment: '내 글에 댓글이 달렸습니다',
  comment_reply: '내 댓글에 답글이 달렸습니다',
  rolling_paper_message: '내 롤링페이퍼에 메시지가 왔습니다',
  rolling_paper_message_reply: '내 메시지에 답장이 왔습니다'
};

function targetLink(n) {
  return n.target_type === 'post' ? `/post/${n.target_id}` : `/paper/${n.target_id}`;
}

function timeAgo(ts) {
  const diffMs = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

export default function NotificationBell() {
  const { user } = useSupabaseAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [actorNames, setActorNames] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const boxRef = useRef(null);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    const rows = data || [];
    setItems(rows);

    const actorIds = [...new Set(rows.map(r => r.actor_id).filter(Boolean))];
    if (actorIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, nickname').in('id', actorIds);
      setActorNames(Object.fromEntries((profs || []).map(p => [p.id, p.nickname])));
    }

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  }

  useEffect(() => {
    if (!user) { setItems([]); setUnreadCount(0); return; }
    load();
    const interval = setInterval(load, 30000);
    function onFocus() { load(); }
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function openNotification(n) {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
      setItems(items.map(i => i.id === n.id ? { ...i, is_read: true } : i));
      setUnreadCount(c => Math.max(c - 1, 0));
    }
    setOpen(false);
    navigate(targetLink(n));
  }

  async function markAllRead() {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setItems(items.map(i => ({ ...i, is_read: true })));
    setUnreadCount(0);
  }

  if (!user) return null;

  return (
    <div className="notif-box" ref={boxRef}>
      <button
        type="button"
        className="notif-bell"
        onClick={() => setOpen(o => !o)}
        aria-label={unreadCount > 0 ? `알림 ${unreadCount}개 안 읽음` : '알림'}
      >
        🔔
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-panel-head">
            <span>알림</span>
            {unreadCount > 0 && <button type="button" className="link-btn" onClick={markAllRead}>모두 읽음</button>}
          </div>
          {items.length === 0 ? (
            <div className="notif-empty">알림이 없습니다.</div>
          ) : (
            items.map(n => (
              <button type="button" key={n.id} className={`notif-item${n.is_read ? '' : ' unread'}`} onClick={() => openNotification(n)}>
                <div className="notif-item-title">
                  {!n.is_read && <span className="notif-dot" aria-hidden="true" />}
                  {actorNames[n.actor_id] ? `${actorNames[n.actor_id]}님이 ` : ''}{TYPE_LABEL[n.type] || '새 알림'}
                </div>
                {n.preview && <div className="notif-item-preview">{n.preview}</div>}
                <div className="notif-item-time">{timeAgo(n.created_at)}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
