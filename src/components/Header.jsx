import { Link } from 'react-router-dom';
import { useTheme } from '../ThemeContext.jsx';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, profile, signOut } = useSupabaseAuth();

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
      <div className="auth-strip">
        {user ? (
          <>
            <Link to="/profile">{profile?.nickname || '내 프로필'}</Link>
            <button type="button" className="link-btn" onClick={signOut}>로그아웃</button>
          </>
        ) : (
          <>
            <Link to="/signin">로그인</Link>
            <Link to="/signup">회원가입</Link>
          </>
        )}
      </div>
    </header>
  );
}
