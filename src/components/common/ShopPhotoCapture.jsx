import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  X,
  Trash2,
  Maximize2,
  RefreshCw,
} from 'lucide-react';

/**
 * Compresses an image client-side to target 50 KB - 100 KB (prefer 70-90 KB)
 */
export const compressImageToTargetSize = (file, minKb = 50, maxKb = 100) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read photo file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale max dimension to 1200px for crisp details
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Iterative JPEG quality tuning to strictly hit 50-100 KB
        let minQ = 0.2;
        let maxQ = 0.95;
        let bestDataUrl = canvas.toDataURL('image/jpeg', 0.75);
        let bestSizeKb = Math.round((bestDataUrl.length * 3) / 4 / 1024);

        for (let i = 0; i < 5; i++) {
          const q = (minQ + maxQ) / 2;
          const currentDataUrl = canvas.toDataURL('image/jpeg', q);
          const currentKb = Math.round((currentDataUrl.length * 3) / 4 / 1024);

          bestDataUrl = currentDataUrl;
          bestSizeKb = currentKb;

          if (currentKb >= minKb && currentKb <= maxKb) {
            break;
          } else if (currentKb > maxKb) {
            maxQ = q;
          } else {
            minQ = q;
          }
        }

        resolve({
          dataUrl: bestDataUrl,
          sizeKb: bestSizeKb,
          width,
          height,
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export default function ShopPhotoCapture({ shop, visitId, onPhotoSaved }) {
  const { currentUser } = useAuth();
  const { shopPhotos = [], addShopPhoto, deleteShopPhoto, getFormattedDate, getFormattedTime } = useData();

  const [previewPhoto, setPreviewPhoto] = useState(null); // { dataUrl, sizeKb }
  const [compressing, setCompressing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState(null);

  const cameraInputRef = useRef(null);

  if (!shop) return null;

  // Filter photos for this specific shop
  const currentShopPhotos = shopPhotos.filter(
    (p) => p.shopId === shop.id || (p.shopName && p.shopName === shop.name)
  );

  const handleFileChange = async (e) => {
    setErrorMessage('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same photo can be retaken if needed
    e.target.value = '';

    setCompressing(true);
    try {
      const result = await compressImageToTargetSize(file, 50, 100);
      setPreviewPhoto(result);
    } catch (err) {
      console.error('Error compressing photo:', err);
      setErrorMessage(
        'Camera permission was denied or photo could not be captured. Camera permission is required to take a photo.'
      );
    } finally {
      setCompressing(false);
    }
  };

  const handleSavePhoto = () => {
    if (!previewPhoto) return;
    setSaving(true);

    try {
      const saved = addShopPhoto({
        shopId: shop.id,
        shopName: shop.name,
        visitId: visitId || null,
        marketerId: currentUser?.id,
        marketerName: currentUser?.name,
        photoType: 'Shop Visit Photo',
        imageData: previewPhoto.dataUrl,
        fileSizeKb: previewPhoto.sizeKb,
        date: getFormattedDate(),
        time: getFormattedTime(),
      });

      setPreviewPhoto(null);
      if (onPhotoSaved) onPhotoSaved(saved);
    } catch (err) {
      console.error('Failed to save shop photo:', err);
      setErrorMessage('Failed to save photo. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRetake = () => {
    setPreviewPhoto(null);
    setErrorMessage('');
    // Directly reopen device camera
    setTimeout(() => {
      cameraInputRef.current?.click();
    }, 100);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center shadow-xs">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
              <span>📷 SHOP PHOTO</span>
              {currentShopPhotos.length > 0 && (
                <span className="px-2 py-0.2 bg-amber-200 text-amber-950 rounded-full text-[10px] font-black">
                  {currentShopPhotos.length}
                </span>
              )}
            </h4>
            <p className="text-[10px] text-slate-500 font-medium">
              Live camera visit proof, storefront, product display & branding
            </p>
          </div>
        </div>
      </div>

      {/* Error Message / Camera Permission Denied Notice */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-bold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{errorMessage}</p>
            <p className="text-[10px] text-red-600 font-semibold mt-0.5">
              Camera permission is required to take a photo. Please allow camera access in browser/device settings.
            </p>
          </div>
        </div>
      )}

      {/* Direct Device Camera Input Only (Strictly Camera, No Gallery/Upload) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Compressing Indicator */}
      {compressing && (
        <div className="py-6 bg-white rounded-2xl border border-dashed border-amber-300 text-center space-y-2 animate-pulse">
          <RefreshCw className="w-6 h-6 text-amber-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-800">Processing & Compressing Photo...</p>
          <p className="text-[10px] text-slate-500">Optimizing to ~70-90 KB for fast save</p>
        </div>
      )}

      {/* Photo Preview & Save Mode */}
      {previewPhoto && !compressing && (
        <div className="bg-white p-3.5 rounded-2xl border border-slate-300 space-y-3 animate-in fade-in shadow-xs">
          <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
            <span>PHOTO PREVIEW</span>
            <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-md">
              {previewPhoto.sizeKb} KB (Compressed)
            </span>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video max-h-56 flex items-center justify-center border border-slate-200">
            <img
              src={previewPhoto.dataUrl}
              alt="Captured Shop Photo"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-xs">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{previewPhoto.sizeKb} KB</span>
            </div>
            <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
              Shop Visit Photo
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retake</span>
            </button>
            <button
              type="button"
              onClick={handleSavePhoto}
              disabled={saving}
              className="flex-1 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Photo ✓'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Primary Action Button (Strictly Camera Capture Only) */}
      {!previewPhoto && !compressing && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-red-700 via-red-800 to-amber-700 hover:from-red-800 hover:to-amber-800 active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-md transition-all"
          >
            <Camera className="w-5 h-5" />
            <span>{currentShopPhotos.length > 0 ? '+ TAKE ANOTHER PHOTO' : 'TAKE PHOTO'}</span>
          </button>

          {/* Existing Photos Thumbnails Grid */}
          {currentShopPhotos.length > 0 && (
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Saved Shop Photos ({currentShopPhotos.length})
              </span>
              <div className="grid grid-cols-4 gap-2">
                {currentShopPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-2xs cursor-pointer"
                    onClick={() => setActiveLightboxPhoto(photo)}
                  >
                    <img
                      src={photo.imageData}
                      alt="Shop thumbnail"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white font-mono text-center py-0.5 backdrop-blur-2xs truncate px-0.5">
                      {photo.date || 'Photo'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {activeLightboxPhoto && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs animate-in fade-in">
          <div className="relative max-w-lg w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
            {/* Lightbox Header */}
            <div className="p-3 bg-slate-950/80 flex justify-between items-center text-white border-b border-slate-800">
              <div>
                <p className="text-xs font-bold text-amber-300">{shop.name}</p>
                <p className="text-[10px] text-slate-400">
                  {activeLightboxPhoto.photoType} • {activeLightboxPhoto.date} {activeLightboxPhoto.time} • {activeLightboxPhoto.fileSizeKb} KB
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveLightboxPhoto(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Display */}
            <div className="p-2 max-h-[70vh] flex items-center justify-center bg-black">
              <img
                src={activeLightboxPhoto.imageData}
                alt="Full Shop Photo"
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>

            {/* Lightbox Footer */}
            <div className="p-3 bg-slate-950 flex justify-between items-center text-xs border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                Marketer: <strong className="text-slate-200">{activeLightboxPhoto.marketerName || 'Field Marketer'}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this photo?')) {
                    deleteShopPhoto(activeLightboxPhoto.id);
                    setActiveLightboxPhoto(null);
                  }
                }}
                className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
