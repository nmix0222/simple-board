import { Link } from 'react-router-dom';
import { useDocumentMeta } from '../lib/useDocumentMeta.js';

export default function Privacy() {
  useDocumentMeta('개인정보처리방침', '온라인 롤링페이퍼 커뮤니티이 어떤 정보를 어떻게 수집하고 보관하는지 안내합니다.');
  return (
    <div className="content-page">
      <h2>개인정보처리방침</h2>
      <p>온라인 롤링페이퍼 커뮤니티(이하 "본 사이트")은 이용자의 개인정보를 소중히 다루며, 아래와 같은 방침에 따라 정보를 처리합니다.</p>

      <h2>1. 수집하는 정보</h2>
      <ul>
        <li>글쓰기·댓글·롤링페이퍼 작성은 회원가입 후 로그인해야 이용할 수 있습니다. 둘러보기는 로그인 없이 가능합니다.</li>
        <li>회원가입 시 아이디, 비밀번호(암호화 저장), 닉네임이 저장됩니다. 실제 이메일이나 실명을 요구하지 않습니다.</li>
        <li>게시글, 댓글, 롤링페이퍼 메시지 작성 시 이용자가 입력한 제목, 내용, (선택 시) 표시 이름이 저장됩니다.</li>
        <li>서비스 이용 과정에서 IP 주소 등 접속 로그가 인프라(Supabase) 차원에서 일반적인 수준으로 기록될 수 있습니다.</li>
      </ul>

      <h2>2. 정보의 저장 및 보관</h2>
      <p>
        수집된 계정 및 게시물 정보는 Supabase(PostgreSQL 기반) 서비스를 통해 저장됩니다.
        본 사이트는 별도의 자체 서버를 운영하지 않으며, 데이터 보관 및 보안은 Supabase의
        인프라 정책과 접근 제어(Row Level Security)를 따릅니다. 비밀번호는 평문으로
        저장되지 않고 암호화되어 저장됩니다.
      </p>

      <h2>3. 광고 및 쿠키(Google AdSense)</h2>
      <p>
        본 사이트는 Google AdSense를 통해 광고를 게재할 수 있습니다. Google을 비롯한 제3자
        광고 공급업체는 쿠키를 사용하여 이용자의 과거 방문 기록을 기반으로 광고를 게재할 수
        있습니다. 이용자는 Google 광고 설정 페이지(
        <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
          adssettings.google.com
        </a>
        )에서 맞춤 광고를 비활성화할 수 있습니다.
      </p>

      <h2>4. 정보의 삭제</h2>
      <p>
        이용자는 본인이 작성한 게시글·댓글을 직접 수정/삭제할 수 있으며, 프로필 페이지에서
        언제든지 회원 탈퇴를 신청할 수 있습니다. 탈퇴 시 계정으로는 더 이상 로그인할 수
        없으나, 이미 작성된 게시물은 커뮤니티 기록 보존을 위해 남아있을 수 있습니다.
      </p>

      <h2>5. 문의</h2>
      <p>
        개인정보 관련 문의사항은 <Link to="/contact">문의하기</Link> 페이지를 통해
        사이트 운영자에게 문의해주시기 바랍니다.
      </p>

      <p style={{ color: 'var(--muted)', fontSize: 12 }}>본 방침은 사전 고지 없이 변경될 수 있습니다.</p>
    </div>
  );
}
