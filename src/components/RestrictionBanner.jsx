import { Link } from 'react-router-dom';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';

export default function RestrictionBanner() {
  const { isRestricted } = useSupabaseAuth();
  if (!isRestricted) return null;

  return (
    <div className="restriction-banner">
      ⚠️ 신고 누적 또는 운영정책 위반으로 이용이 제한된 계정입니다. 새 글·댓글·롤링페이퍼 작성이 제한됩니다.
      자세한 사유는 <Link to="/contact">문의하기</Link>로 연락해주세요.
    </div>
  );
}
