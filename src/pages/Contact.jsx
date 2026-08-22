export default function Contact() {
  return (
    <div className="content-page">
      <h2>문의하기</h2>
      <p>
        서비스 이용 중 궁금한 점이나 불편사항, 저작권/명예훼손 등 긴급히 처리가 필요한 신고 건은
        아래 이메일로 연락해주세요. 가능한 빠르게 확인 후 답변드리겠습니다.
      </p>
      <p>
        <strong>이메일</strong>: <a href="mailto:lee66721711a@gmail.com" style={{ color: 'var(--accent)' }}>lee66721711a@gmail.com</a>
      </p>
      <h2>이런 문의를 받습니다</h2>
      <ul>
        <li>계정/로그인 관련 문제</li>
        <li>게시물·댓글·롤링페이퍼 신고 후 추가 확인이 필요한 경우</li>
        <li>저작권 침해, 명예훼손 등 긴급 삭제 요청</li>
        <li>버그 제보 및 기능 제안</li>
        <li>광고/제휴 문의</li>
      </ul>
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>
        일반적인 신고는 각 게시물·댓글의 🚩 신고 버튼을 이용해주시면 더 빠르게 처리됩니다.
      </p>
    </div>
  );
}
