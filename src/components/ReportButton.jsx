import { useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { useSupabaseAuth } from '../SupabaseAuthContext.jsx';

const REASONS = [
  { value: 'abuse', label: '욕설' },
  { value: 'defamation', label: '악의적인 비방' },
  { value: 'sexual', label: '성적인 콘텐츠' },
  { value: 'privacy', label: '개인정보 노출' },
  { value: 'spam', label: '스팸' },
  { value: 'other', label: '기타' }
];

export default function ReportButton({ targetType, targetId }) {
  const { user } = useSupabaseAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('abuse');
  const [detail, setDetail] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!user) { alert('로그인 후 이용해주세요.'); return; }
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      detail: detail.trim() || null
    });
    if (error) {
      alert(error.message.includes('duplicate') ? '이미 신고한 콘텐츠입니다.' : error.message);
      return;
    }
    setDone(true);
    setTimeout(() => { setOpen(false); setDone(false); }, 1200);
  }

  if (!open) {
    return <button type="button" className="reaction-btn" onClick={() => setOpen(true)}>🚩 신고</button>;
  }

  return (
    <span style={{ display: 'inline-block' }}>
      {done ? (
        <span style={{ fontSize: 12, color: 'var(--accent)' }}>신고가 접수되었습니다</span>
      ) : (
        <form onSubmit={submit} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
          <select aria-label="신고 사유" value={reason} onChange={e => setReason(e.target.value)} style={{ width: 'auto', padding: '4px 6px', fontSize: 12 }}>
            {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <input
            type="text"
            aria-label="상세 사유"
            placeholder="상세 사유 (선택)"
            value={detail}
            onChange={e => setDetail(e.target.value)}
            style={{ width: 140, padding: '4px 6px', fontSize: 12 }}
          />
          <button type="submit" className="reaction-btn">접수</button>
          <button type="button" className="link-btn" onClick={() => setOpen(false)}>취소</button>
        </form>
      )}
    </span>
  );
}
