import { NavLink } from 'react-router-dom';

export default function Header() {
  return (
    <header className="site-header">
      <h1>📋 간단 게시판</h1>
      <nav className="main-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>
          게시판
        </NavLink>
        <NavLink to="/rolling" className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>
          롤링페이퍼
        </NavLink>
      </nav>
    </header>
  );
}
