import { Link } from 'react-router-dom';
import { useTheme } from '../ThemeContext.jsx';

export default function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="site-header">
      <div className="header-top">
        <Link to="/" className="site-title">
          <h1>📋 간단 게시판</h1>
        </Link>
        <button type="button" className="theme-toggle" onClick={toggleTheme} title="테마 전환">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
