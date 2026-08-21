import { useEffect, useState } from 'react';
import { collection, addDoc, query, where, orderBy, getDocs, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';
import AdSlot from '../components/AdSlot.jsx';

const CARD_COLORS = ['#fff4cc', '#ffe0e6', '#dbeafe', '#dcfce7', '#f3e8ff', '#ffedd5'];

function generatePasskey() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function RollingPaper() {
  const [tab, setTab] = useState('enter');
  const [rollingTitle, setRollingTitle] = useState('');
  const [createdPasskey, setCreatedPasskey] = useState(null);
  const [enterPasskey, setEnterPasskey] = useState('');
  const [paper, setPaper] = useState(null);
  const [messages, setMessages] = useState(null);
  const [msgAuthor, setMsgAuthor] = useState('');
  const [msgContent, setMsgContent] = useState('');

  useEffect(() => {
    if (!paper) return;
    const q = query(collection(db, 'rollingPapers', paper.id, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snapshot => {
      setMessages(snapshot.docs.map(d => d.data()));
    });
    return unsub;
  }, [paper]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!rollingTitle.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    let passkey = generatePasskey();
    for (let i = 0; i < 5; i++) {
      const dup = await getDocs(query(collection(db, 'rollingPapers'), where('passkey', '==', passkey)));
      if (dup.empty) break;
      passkey = generatePasskey();
    }
    const ref = await addDoc(collection(db, 'rollingPapers'), {
      title: rollingTitle.trim(),
      passkey,
      createdAt: serverTimestamp()
    });
    setCreatedPasskey({ id: ref.id, title: rollingTitle.trim(), passkey });
  }

  async function handleEnter(e) {
    e.preventDefault();
    const passkey = enterPasskey.trim().toUpperCase();
    if (!passkey) {
      alert('패스키를 입력해주세요.');
      return;
    }
    const snapshot = await getDocs(query(collection(db, 'rollingPapers'), where('passkey', '==', passkey)));
    if (snapshot.empty) {
      alert('존재하지 않는 패스키입니다.');
      return;
    }
    const docSnap = snapshot.docs[0];
    setPaper({ id: docSnap.id, ...docSnap.data() });
  }

  async function handleAddMessage(e) {
    e.preventDefault();
    if (!msgContent.trim()) {
      alert('메시지 내용을 입력해주세요.');
      return;
    }
    await addDoc(collection(db, 'rollingPapers', paper.id, 'messages'), {
      author: msgAuthor.trim(),
      content: msgContent.trim(),
      createdAt: serverTimestamp()
    });
    setMsgAuthor('');
    setMsgContent('');
  }

  function exitWall() {
    setPaper(null);
    setMessages(null);
    setEnterPasskey('');
    setRollingTitle('');
    setCreatedPasskey(null);
    setTab('enter');
  }

  if (paper) {
    return (
      <>
        <div className="wall-header">
          <div>
            <div className="wall-title">{paper.title}</div>
            <div className="wall-passkey">패스키: {paper.passkey}</div>
          </div>
          <button type="button" className="btn-secondary" onClick={exitWall}>나가기</button>
        </div>
        <section className="write-box">
          <h2>메시지 남기기</h2>
          <form onSubmit={handleAddMessage}>
            <div className="row">
              <input type="text" placeholder="이름" style={{ maxWidth: 120 }} value={msgAuthor} onChange={e => setMsgAuthor(e.target.value)} />
            </div>
            <div className="row">
              <textarea placeholder="따뜻한 메시지를 남겨주세요" value={msgContent} onChange={e => setMsgContent(e.target.value)} />
            </div>
            <div className="actions">
              <button className="btn-primary" type="submit">남기기</button>
            </div>
          </form>
        </section>
        <AdSlot />
        <div className="message-wall">
          {messages === null ? null : messages.length === 0 ? (
            <div className="empty">아직 남겨진 메시지가 없습니다.</div>
          ) : (
            messages.map((m, i) => (
              <div className="message-card" style={{ background: CARD_COLORS[i % CARD_COLORS.length] }} key={i}>
                <div className="message-author">{m.author || '익명'}</div>
                <div className="message-content">{m.content}</div>
              </div>
            ))
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="rolling-tabs">
        <button type="button" className={`rolling-tab${tab === 'enter' ? ' active' : ''}`} onClick={() => setTab('enter')}>입장하기</button>
        <button type="button" className={`rolling-tab${tab === 'create' ? ' active' : ''}`} onClick={() => setTab('create')}>만들기</button>
      </div>

      {tab === 'enter' ? (
        <div className="write-box">
          <h2>패스키로 입장하기</h2>
          <form onSubmit={handleEnter}>
            <div className="row">
              <input type="text" placeholder="패스키 6자리 입력" value={enterPasskey} onChange={e => setEnterPasskey(e.target.value)} />
            </div>
            <div className="actions">
              <button className="btn-primary" type="submit">입장</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="write-box">
          <h2>롤링페이퍼 만들기</h2>
          <form onSubmit={handleCreate}>
            <div className="row">
              <input
                type="text"
                placeholder="롤링페이퍼 제목 (예: OOO를 위한 롤링페이퍼)"
                value={rollingTitle}
                onChange={e => setRollingTitle(e.target.value)}
              />
            </div>
            <div className="actions">
              <button className="btn-primary" type="submit">만들기</button>
            </div>
          </form>
          {createdPasskey && (
            <div className="passkey-display">
              <div>생성된 패스키</div>
              <div className="passkey-code">{createdPasskey.passkey}</div>
              <div className="passkey-hint">이 패스키가 있어야만 들어올 수 있어요. 꼭 저장/공유해두세요.</div>
              <div className="actions" style={{ justifyContent: 'center', marginTop: 10 }}>
                <button className="btn-primary" type="button" onClick={() => setPaper(createdPasskey)}>바로 입장하기</button>
              </div>
            </div>
          )}
        </div>
      )}

      <AdSlot />
    </>
  );
}
