import { useEffect } from 'react';

const SITE_NAME = '온라인 롤링페이퍼 커뮤니티';
const DEFAULT_TITLE = `${SITE_NAME} - 자유롭게 소통하는 커뮤니티`;
const DEFAULT_DESCRIPTION = '연예인, 개그, 유머, 스포츠, 게임 등 다양한 분야 게시판과 패스키로 보호되는 롤링페이퍼를 무료로 이용하세요.';

function setMeta(name, content, attr = 'name') {
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

// 각 페이지에서 이 훅을 호출하면 브라우저 탭 제목과 description/OG 메타 태그가
// 해당 페이지 내용에 맞게 바뀐다. 언마운트 시 사이트 기본값으로 되돌린다.
export function useDocumentMeta(title, description) {
  useEffect(() => {
    const fullTitle = title ? `${title} - ${SITE_NAME}` : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESCRIPTION;
    document.title = fullTitle;
    setMeta('description', desc);
    setMeta('og:title', fullTitle, 'property');
    setMeta('og:description', desc, 'property');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', desc);
    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('description', DEFAULT_DESCRIPTION);
      setMeta('og:title', DEFAULT_TITLE, 'property');
      setMeta('og:description', DEFAULT_DESCRIPTION, 'property');
      setMeta('twitter:title', DEFAULT_TITLE);
      setMeta('twitter:description', DEFAULT_DESCRIPTION);
    };
  }, [title, description]);
}
