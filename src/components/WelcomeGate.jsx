import { useState } from 'react';
import { Link } from 'react-router-dom';

const KEY = 'welcome-seen';

export default function WelcomeGate() {
  const [visible, setVisible] = useState(() => {
    try {
      return !localStorage.getItem(KEY);
    } catch (e) {
      return true;
    }
  });

  function dismiss() {
    try {
      localStorage.setItem(KEY, '1');
    } catch (e) {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={dismiss}>
      <section className="write-box modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>환영합니다</h2>
          <button type="button" className="modal-close" onClick={dismiss}>✕</button>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
          회원가입과 로그인은 사용자들의 악의적인 비방, 욕설 및 부적절한 콘텐츠를 방지하고
          안전하고 건전한 커뮤니티 환경을 유지하기 위해 운영됩니다. 이용에 불편함이 있을 수
          있는 점 양해 부탁드립니다.
        </p>
        <div className="actions" style={{ gap: 8 }}>
          <Link to="/signin" className="btn-secondary" onClick={dismiss} style={{ display: 'inline-block' }}>로그인</Link>
          <Link to="/signup" className="btn-primary" onClick={dismiss} style={{ display: 'inline-block' }}>회원가입</Link>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, textAlign: 'center' }}>
          둘러보기만 하려면 창을 닫아주세요. 글쓰기·댓글·롤링페이퍼 작성은 로그인 후 가능합니다.
        </p>
      </section>
    </div>
  );
}
