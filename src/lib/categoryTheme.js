// 분야별 은은한 배경 색조. 낭만적인 느낌을 위해 파스텔 톤 + 부드러운 대비를 사용한다.
export const CATEGORY_HUES = {
  '전체': 265,        // 노을빛 라벤더 (기본)
  '유머': 28,          // 따뜻한 오렌지
  '개그': 45,          // 밝은 살구빛
  '연예인': 330,        // 로즈 핑크
  '시사': 205,          // 차분한 스틸블루
  '기사': 195,
  '자유게시판': 250,     // 바이올렛
  '게임': 165,          // 민트-틸
  '영화/드라마': 285,    // 자수정 보라
  '음악': 300,          // 마젠타 라벤더
  '스포츠': 140,        // 생기있는 그린
  '롤링페이퍼': 350      // 은은한 로맨틱 레드
};

export function gradientFor(hue, isDark) {
  const h2 = (hue + 45) % 360;
  if (isDark) {
    return `radial-gradient(circle at 15% 0%, hsl(${hue} 55% 16%) 0%, transparent 48%),
      radial-gradient(circle at 100% 15%, hsl(${h2} 50% 14%) 0%, transparent 42%),
      linear-gradient(180deg, hsl(${hue} 22% 9%) 0%, hsl(${hue} 18% 7%) 100%)`;
  }
  return `radial-gradient(circle at 15% 0%, hsl(${hue} 78% 93%) 0%, transparent 48%),
    radial-gradient(circle at 100% 15%, hsl(${h2} 70% 91%) 0%, transparent 42%),
    linear-gradient(180deg, hsl(${hue} 45% 97%) 0%, hsl(${hue} 35% 95%) 100%)`;
}
