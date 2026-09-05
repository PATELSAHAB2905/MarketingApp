// Firebase Configuration and Service Abstraction for Patel Sahab Spices
import { app, db, firebaseConfig } from '../firebase';

export { app, db, firebaseConfig };

export const getFirebaseConfig = () => firebaseConfig;

export const saveFirebaseConfig = (newConfig) => {
  if (!newConfig) return;
  Object.keys(newConfig).forEach((key) => {
    localStorage.setItem(`PATEL_FIREBASE_${key.toUpperCase()}`, newConfig[key]);
  });
};

export const isFirebaseConfigured = () => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
};

export default app;
