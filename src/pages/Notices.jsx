import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { formatDateTime } from '../lib/format.js';

export default function Notices() {
  const [notices, setNotices] = useState(null);

  useEffect(() => {
    supabase.from('notices').select('*').order('created_at', { ascending: false }).then(({ data }) => setNotices(data || []));
  }, []);

  return (
    <>
      <div className="list-header"><span>공지사항</span></div>
      {notices === null ? (
        <div className="empty">불러오는 중...</div>
      ) : notices.length === 0 ? (
        <div className="empty">등록된 공지사항이 없습니다.</div>
      ) : (
        notices.map(n => (
          <article className="post" key={n.id}>
            <div className="post-top">
              <div className="post-title">{n.title}</div>
              <div className="post-meta">{formatDateTime(n.created_at)}</div>
            </div>
            <div className="post-body">{n.content}</div>
          </article>
        ))
      )}
    </>
  );
}
