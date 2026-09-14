import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a compressed image blob to Firebase Storage.
 * Provides resilient fallback for offline operations so field marketers never get blocked.
 *
 * @param {Object} params
 * @param {Blob} params.blob - Compressed image blob
 * @param {string} params.dataUrl - Lightweight preview data URL fallback
 * @param {string} params.storagePath - Desired storage path in Firebase Storage
 * @param {string} [params.mimeType='image/webp'] - MIME type
 * @param {number} [params.compressedSizeKb=0] - Size in KB
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
  customMetadata = {},
}) {
  const timestamp = new Date().toISOString();

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
}) {
  const ext = mimeType.includes('webp') ? 'webp' : 'jpg';
  const storagePath = `collection-photos/${collectionId || 'pending'}/${photoId}.${ext}`;

  return uploadPhotoToFirebaseStorage({
    blob,
    dataUrl,
    storagePath,
    mimeType,
    compressedSizeKb,
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
    customMetadata: {
      shopId: String(shopId || ''),
      shopName: String(shopName || ''),
      visitId: String(visitId || ''),
      marketerId: String(marketerId || ''),
      type: 'Shop Visit Photo',
    },
  });
}
