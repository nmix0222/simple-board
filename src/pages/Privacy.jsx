export default function Privacy() {
  return (
    <div className="content-page">
      <h2>개인정보처리방침</h2>
      <p>간단 게시판(이하 "본 사이트")은 이용자의 개인정보를 소중히 다루며, 아래와 같은 방침에 따라 정보를 처리합니다.</p>

      <h2>1. 수집하는 정보</h2>
      <ul>
        <li>본 사이트는 별도의 회원가입/로그인 절차 없이 이용할 수 있습니다.</li>
        <li>게시글, 댓글, 롤링페이퍼 메시지 작성 시 이용자가 직접 입력한 이름(닉네임), 글 제목, 내용이 저장됩니다.</li>
        <li>이 정보는 실명이 아닌 임의의 닉네임으로 입력해도 이용에 지장이 없습니다.</li>
      </ul>

      <h2>2. 정보의 저장 및 보관</h2>
      <p>
        수집된 게시물 정보는 Google Firebase(Firestore) 서비스를 통해 저장됩니다.
        본 사이트는 별도의 자체 서버를 운영하지 않으며, 데이터 보관 및 보안은 Google Cloud의
        인프라 정책을 따릅니다.
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
        이용자는 본인이 작성한 게시글 하단의 "삭제" 버튼을 통해 언제든지 직접 게시물을
        삭제할 수 있습니다.
      </p>

      <h2>5. 문의</h2>
      <p>개인정보 관련 문의사항은 사이트 운영자에게 문의해주시기 바랍니다.</p>

      <p style={{ color: 'var(--muted)', fontSize: 12 }}>본 방침은 사전 고지 없이 변경될 수 있습니다.</p>
    </div>
  );
}
