import { useEffect } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase.js';

const KEY = 'viewed-posts';

export function useViewCount(postId) {
  useEffect(() => {
    try {
      const viewed = JSON.parse(sessionStorage.getItem(KEY) || '[]');
      if (viewed.includes(postId)) return;
      viewed.push(postId);
      sessionStorage.setItem(KEY, JSON.stringify(viewed));
      updateDoc(doc(db, 'posts', postId), { views: increment(1) }).catch(() => {});
    } catch (e) {
      // sessionStorage unavailable (private mode etc.) — skip silently
    }
  }, [postId]);
}
