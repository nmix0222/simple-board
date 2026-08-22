import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { formatDateTime } from '../lib/format.js';
import { useDocumentMeta } from '../lib/useDocumentMeta.js';

export default function Notices() {
  useDocumentMeta('공지사항', '온라인 롤링페이퍼 커뮤니티의 운영 공지사항을 확인하세요.');
  const [notices, setNotices] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.from('notices').select('*').order('created_at', { ascending: false }).then(({ data }) => setNotices(data || []));
  }, []);

  const filtered = notices && search.trim()
    ? notices.filter(n => n.title.toLowerCase().includes(search.trim().toLowerCase()) || n.content.toLowerCase().includes(search.trim().toLowerCase()))
    : notices;

  return (
    <>
      <div className="list-header"><span>공지사항</span></div>
      <div className="row" style={{ marginBottom: 12 }}>
        <input type="text" placeholder="공지사항 검색" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {filtered === null ? (
        <div className="empty">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="empty">{search.trim() ? '검색 결과가 없습니다.' : '등록된 공지사항이 없습니다.'}</div>
      ) : (
        filtered.map(n => (
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
