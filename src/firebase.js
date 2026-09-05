import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyAvJgC0QnwgQNVew17ROK8g0GzDn52bE70",
  authDomain: "marketing-management-app-fa004.firebaseapp.com",
  projectId: "marketing-management-app-fa004",
  storageBucket: "marketing-management-app-fa004.firebasestorage.app",
  messagingSenderId: "417639653598",
  appId: "1:417639653598:web:3cce88ad266e3544b7624f"
};

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Cloud Firestore
const db = getFirestore(app);

export { app, db };
export default app;
