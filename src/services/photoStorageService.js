import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a compressed image blob to Firebase Storage.
 * Provides resilient fallback for offline operations so field marketers never get blocked.
 * Strict Workday Validation: Rejects upload if marketer day session is not ACTIVE.
 *
 * @param {Object} params
 * @param {Blob} params.blob - Compressed image blob
 * @param {string} params.dataUrl - Lightweight preview data URL fallback
 * @param {string} params.storagePath - Desired storage path in Firebase Storage
 * @param {string} [params.mimeType='image/webp'] - MIME type
 * @param {number} [params.compressedSizeKb=0] - Size in KB
 * @param {boolean} [params.isDayActive=true] - Day active status flag
 * @param {string} [params.role='MARKETER'] - User role ('ADMIN' or 'MARKETER')
 * @param {Object} [params.customMetadata={}] - Custom metadata attributes
 * @returns {Promise<{
 *   photoUrl: string,
 *   photoStoragePath: string|null,
 *   compressedSizeKb: number,
 *   mimeType: string,
 *   photoUploadedAt: string,
 *   isOfflineFallback: boolean
 * }>}
 */
export async function uploadPhotoToFirebaseStorage({
  blob,
  dataUrl,
  storagePath,
  mimeType = 'image/webp',
  compressedSizeKb = 0,
  isDayActive = true,
  role = 'MARKETER',
  customMetadata = {},
}) {
  const timestamp = new Date().toISOString();

  // Strict Workday Validation: Block Storage writes if day session is not active for Marketer
  if (role !== 'ADMIN' && !isDayActive) {
    const errorMsg = 'Photo upload blocked: Your workday has not started. Please submit Start My Day first.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // If no blob is available or offline, return local dataUrl safely
  if (!blob || !navigator.onLine) {
    return {
      photoUrl: dataUrl || '',
      photoStoragePath: null,
      compressedSizeKb,
      mimeType,
      photoUploadedAt: timestamp,
      isOfflineFallback: true,
    };
  }

  try {
    const storageRef = ref(storage, storagePath);
    const metadata = {
      contentType: mimeType,
      customMetadata: {
        uploadedAt: timestamp,
        compressedSizeKb: String(compressedSizeKb),
        app: 'PatelSahabSpicesMarketing',
        ...customMetadata,
      },
    };

    // Upload compressed binary to Firebase Storage
    const snapshot = await uploadBytes(storageRef, blob, metadata);
    const downloadUrl = await getDownloadURL(snapshot.ref);

    return {
      photoUrl: downloadUrl,
      photoStoragePath: snapshot.ref.fullPath,
      compressedSizeKb,
      mimeType,
      photoUploadedAt: timestamp,
      isOfflineFallback: false,
    };
  } catch (err) {
    console.warn('Firebase Storage upload failed, using local resilient fallback:', err);
    return {
      photoUrl: dataUrl || '',
      photoStoragePath: null,
      compressedSizeKb,
      mimeType,
      photoUploadedAt: timestamp,
      isOfflineFallback: true,
    };
  }
}

/**
 * Helper to upload Collection Slip photo
 */
export async function uploadCollectionSlipPhoto({
  blob,
  dataUrl,
  collectionId,
  photoId = `slip-${Date.now()}`,
  compressedSizeKb = 0,
  mimeType = 'image/webp',
  shopId = '',
  marketerId = '',
  isDayActive = true,
  role = 'MARKETER',
}) {
  const ext = mimeType.includes('webp') ? 'webp' : 'jpg';
  const storagePath = `collection-photos/${collectionId || 'pending'}/${photoId}.${ext}`;

  return uploadPhotoToFirebaseStorage({
    blob,
    dataUrl,
    storagePath,
    mimeType,
    compressedSizeKb,
    isDayActive,
    role,
    customMetadata: {
      collectionId: String(collectionId || ''),
      shopId: String(shopId || ''),
      marketerId: String(marketerId || ''),
      type: 'Collection Slip Photo',
    },
  });
}

/**
 * Helper to upload Shop Visit Photo
 */
export async function uploadShopVisitPhoto({
  blob,
  dataUrl,
  shopId,
  visitId,
  photoId = `photo-${Date.now()}`,
  compressedSizeKb = 0,
  mimeType = 'image/webp',
  shopName = '',
  marketerId = '',
  isDayActive = true,
  role = 'MARKETER',
}) {
  const ext = mimeType.includes('webp') ? 'webp' : 'jpg';
  const folderKey = shopId || visitId || 'general';
  const storagePath = `shop-photos/${folderKey}/${photoId}.${ext}`;

  return uploadPhotoToFirebaseStorage({
    blob,
    dataUrl,
    storagePath,
    mimeType,
    compressedSizeKb,
    isDayActive,
    role,
    customMetadata: {
      shopId: String(shopId || ''),
      shopName: String(shopName || ''),
      visitId: String(visitId || ''),
      marketerId: String(marketerId || ''),
      type: 'Shop Visit Photo',
    },
  });
}
