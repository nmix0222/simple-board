import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="content-page" style={{ textAlign: 'center', padding: '60px 20px' }}>
      <h2 style={{ fontSize: 28, marginBottom: 8 }}>404</h2>
      <p style={{ color: 'var(--muted)', marginBottom: 20 }}>존재하지 않는 페이지입니다.</p>
      <Link to="/" className="btn-primary" style={{ display: 'inline-block' }}>게시판으로 돌아가기</Link>
    </div>
  );
}
