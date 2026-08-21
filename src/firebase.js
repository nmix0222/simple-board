import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC56fDWIpbORE_RyCrCS6zxzzfLddC9Njc',
  authDomain: 'simple-board-8b064.firebaseapp.com',
  projectId: 'simple-board-8b064',
  storageBucket: 'simple-board-8b064.firebasestorage.app',
  messagingSenderId: '199343169394',
  appId: '1:199343169394:web:d89f8f684155058165c7eb'
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
