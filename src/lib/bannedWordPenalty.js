// posts/comments/rolling_paper_messages INSERT/UPDATE 트리거가 금칙어를 막을 때 공통으로 뜨는 에러 메시지 조각
const BANNED_WORD_MARKER = '금칙어가 포함되어';

export function isBannedWordError(error) {
  return !!error?.message?.includes(BANNED_WORD_MARKER);
}

// 트리거가 등록/수정 자체는 이미 막았으므로(우회 불가), 여기서는 위반 시도를 계정에 기록만 한다.
// 반환값: 사용자에게 보여줄 안내 문구
export async function reportBannedWordViolation(supabase, content) {
  try {
    const { data, error } = await supabase.rpc('handle_banned_word_violation', { p_content: content });
    if (error) throw error;
    if (data === 'banned') {
      return '금칙어가 포함되어 있어 등록할 수 없습니다.\n음란물/성인 콘텐츠 관련 금칙어가 감지되어 계정 이용이 즉시 정지되었습니다.';
    }
    if (data === 'warned') {
      return '금칙어가 포함되어 있어 등록할 수 없습니다.\n해당 계정에 경고가 기록되었습니다. 반복 시 이용이 제한될 수 있습니다.';
    }
    return '금칙어가 포함되어 있어 등록할 수 없습니다.';
  } catch {
    return '금칙어가 포함되어 있어 등록할 수 없습니다.';
  }
}
