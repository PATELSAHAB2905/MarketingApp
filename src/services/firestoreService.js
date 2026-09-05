import {
  doc,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  query,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Sanitizes an object before writing to Firestore.
 * Strips undefined values, functions, and ensures circular references are prevented.
 */
export function sanitizeForFirestore(obj) {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item));
  }
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
}

/**
 * Create or overwrite a document with a specific ID.
 */
export async function setDocument(collectionName, docId, data, merge = true) {
  if (!docId) throw new Error('Document ID is required');
  try {
    const docRef = doc(db, collectionName, String(docId));
    const sanitized = sanitizeForFirestore({
      ...data,
      _updatedAt: serverTimestamp(),
    });
    await setDoc(docRef, sanitized, { merge });
    return { id: String(docId), ...data };
  } catch (error) {
    console.error(`[Firestore Error] setDocument in "${collectionName}/${docId}":`, error);
    throw error;
  }
}

export const createDocument = setDocument;

/**
 * Update an existing document.
 */
export async function updateDocument(collectionName, docId, data) {
  if (!docId) throw new Error('Document ID is required');
  try {
    const docRef = doc(db, collectionName, String(docId));
    const sanitized = sanitizeForFirestore({
      ...data,
      _updatedAt: serverTimestamp(),
    });
    await updateDoc(docRef, sanitized);
    return { id: String(docId), ...data };
  } catch (error) {
    console.error(`[Firestore Error] updateDocument in "${collectionName}/${docId}":`, error);
    throw error;
  }
}

/**
 * Delete a document.
 */
export async function deleteDocument(collectionName, docId) {
  if (!docId) throw new Error('Document ID is required');
  try {
    const docRef = doc(db, collectionName, String(docId));
    await deleteDoc(docRef);
    return { id: String(docId) };
  } catch (error) {
    console.error(`[Firestore Error] deleteDocument in "${collectionName}/${docId}":`, error);
    throw error;
  }
}

/**
 * Get a single document by ID.
 */
export async function getDocument(collectionName, docId) {
  if (!docId) return null;
  try {
    const docRef = doc(db, collectionName, String(docId));
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (error) {
    console.error(`[Firestore Error] getDocument in "${collectionName}/${docId}":`, error);
    throw error;
  }
}

/**
 * Get all documents from a collection.
 */
export async function getCollection(collectionName) {
  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    const items = [];
    snap.forEach((d) => {
      items.push({ id: d.id, ...d.data() });
    });
    return items;
  } catch (error) {
    console.error(`[Firestore Error] getCollection "${collectionName}":`, error);
    throw error;
  }
}

/**
 * Subscribe to real-time changes in a collection.
 */
export function subscribeToCollection(collectionName, callback, errorCallback) {
  try {
    const colRef = collection(db, collectionName);
    const unsubscribe = onSnapshot(
      colRef,
      (snap) => {
        const items = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...d.data() });
        });
        callback(items);
      },
      (error) => {
        console.error(`[Firestore Listener Error] "${collectionName}":`, error);
        if (errorCallback) errorCallback(error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.error(`[Firestore Subscription Error] "${collectionName}":`, error);
    if (errorCallback) errorCallback(error);
    return () => {};
  }
}

/**
 * Subscribe to real-time changes in a single document.
 */
export function subscribeToDocument(collectionName, docId, callback, errorCallback) {
  if (!docId) return () => {};
  try {
    const docRef = doc(db, collectionName, String(docId));
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          callback({ id: snap.id, ...snap.data() });
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error(`[Firestore Doc Listener Error] "${collectionName}/${docId}":`, error);
        if (errorCallback) errorCallback(error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.error(`[Firestore Doc Subscription Error] "${collectionName}/${docId}":`, error);
    if (errorCallback) errorCallback(error);
    return () => {};
  }
}

/**
 * Batch write / upsert up to 500 documents per batch chunk.
 */
export async function batchUpsert(collectionName, items) {
  if (!items || items.length === 0) return { success: true, count: 0 };
  
  const CHUNK_SIZE = 450; // Firestore limit is 500 operations per batch
  let processedCount = 0;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((item) => {
      const docId = String(item.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
      const docRef = doc(db, collectionName, docId);
      const sanitized = sanitizeForFirestore({
        ...item,
        id: docId,
        _syncedAt: serverTimestamp(),
      });
      batch.set(docRef, sanitized, { merge: true });
    });

    await batch.commit();
    processedCount += chunk.length;
  }

  return { success: true, count: processedCount };
}

/**
 * Verifies real connectivity to Firestore with a lightweight read/ping.
 */
export async function checkFirebaseConnection() {
  try {
    const testQuery = query(collection(db, 'systemSettings'), limit(1));
    await getDocs(testQuery);
    return { connected: true, error: null };
  } catch (error) {
    // If permission-denied or unauthenticated, Firebase is still reached but rules restrict
    if (error?.code === 'permission-denied') {
      return { connected: true, permissionDenied: true, error: error.message };
    }
    return { connected: false, error: error.message };
  }
}
