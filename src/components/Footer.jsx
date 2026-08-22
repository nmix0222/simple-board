import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <Link to="/notices">공지사항</Link>
        <Link to="/about">사이트 소개</Link>
        <Link to="/content-policy">콘텐츠 정책</Link>
        <Link to="/terms">이용약관</Link>
        <Link to="/privacy">개인정보처리방침</Link>
        <Link to="/contact">문의하기</Link>
        <Link to="/admin" style={{ opacity: 0.5 }}>관리자</Link>
      </div>
      <div style={{ marginTop: 8 }}>© {new Date().getFullYear()} 우리들의 게시판</div>
    </footer>
  );
}
