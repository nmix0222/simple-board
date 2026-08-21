import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <Link to="/about">사이트 소개</Link>
        <Link to="/privacy">개인정보처리방침</Link>
        <Link to="/terms">이용약관</Link>
      </div>
      <div style={{ marginTop: 8 }}>© {new Date().getFullYear()} 간단 게시판</div>
    </footer>
  );
}
