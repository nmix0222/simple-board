import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';

function formatDate(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function UserProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: prof } = await supabase.from('profiles').select('nickname, created_at').eq('id', id).single();
      setProfile(prof || null);
      const { data: ps } = await supabase
        .from('posts')
        .select('id, title, created_at, view_count, like_count, comment_count')
        .eq('author_id', id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);
      setPosts(ps || []);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="empty">불러오는 중...</div>;
  if (!profile) return <div className="empty">존재하지 않는 사용자입니다.</div>;

  return (
    <>
      <div className="content-page" style={{ marginBottom: 20 }}>
        <h2>{profile.nickname}</h2>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>가입일 {formatDate(profile.created_at)} · 작성글 {posts.length}개</p>
      </div>
      <div className="list-header"><span>작성한 글</span></div>
      <section>
        {posts.length === 0 ? (
          <div className="empty">작성한 글이 없습니다.</div>
        ) : (
          posts.map(p => (
            <Link to={`/post/${p.id}`} key={p.id} style={{ display: 'block' }}>
              <article className="post">
                <div className="post-top">
                  <div className="post-title">{p.title}</div>
                  <div className="post-meta">{formatDate(p.created_at)}</div>
                </div>
                <div className="post-footer">
                  <span className="post-author">조회 {p.view_count} · 추천 {p.like_count} · 댓글 {p.comment_count}</span>
                </div>
              </article>
            </Link>
          ))
        )}
      </section>
    </>
  );
}
