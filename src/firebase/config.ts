import { getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

export const firebaseConfig = {
  apiKey: "AIzaSyAhuuzNgJqAiGbWkQFmGPHaGCA_pgieX20",
  authDomain: "msw-badminton.firebaseapp.com",
  projectId: "msw-badminton",
  storageBucket: "msw-badminton.appspot.com",
  messagingSenderId: "833949817426",
  appId: "1:833949817426:web:7bea3abacf0bf65ca85d8b",
  measurementId: "G-H64SB2DLMM"
};

// Initialize Firebase app for server-side use
const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);