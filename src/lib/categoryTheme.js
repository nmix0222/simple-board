// 분야별 배경 색조. 낭만적인 느낌을 위해 또렷하게 보이는 톤을 사용한다.
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
  '롤링페이퍼': 350      // 로맨틱 레드
};

export function gradientFor(hue, isDark) {
  const h2 = (hue + 45) % 360;
  if (isDark) {
    return `radial-gradient(circle at 15% 0%, hsl(${hue} 60% 22%) 0%, transparent 60%),
      radial-gradient(circle at 100% 10%, hsl(${h2} 55% 18%) 0%, transparent 55%),
      radial-gradient(circle at 50% 100%, hsl(${hue} 45% 14%) 0%, transparent 60%),
      linear-gradient(180deg, hsl(${hue} 25% 10%) 0%, hsl(${hue} 20% 7%) 100%)`;
  }
  return `radial-gradient(circle at 15% 0%, hsl(${hue} 85% 85%) 0%, transparent 60%),
    radial-gradient(circle at 100% 10%, hsl(${h2} 80% 84%) 0%, transparent 55%),
    radial-gradient(circle at 50% 100%, hsl(${hue} 70% 88%) 0%, transparent 60%),
    linear-gradient(180deg, hsl(${hue} 45% 95%) 0%, hsl(${hue} 35% 92%) 100%)`;
}
