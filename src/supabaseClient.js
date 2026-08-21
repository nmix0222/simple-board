import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY가 설정되지 않았습니다. ' +
    '.env.local에 값을 채워주세요 (.env.example 참고). Supabase 기반 기능은 아직 연결되지 않았습니다.'
  );
}

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
