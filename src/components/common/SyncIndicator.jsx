import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Cloud, WifiOff, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import FirebaseSyncModal from './FirebaseSyncModal';

export default function SyncIndicator() {
  const {
    isFirebaseConnected,
    firebaseSyncStatus,
    isOfflineMode,
    setIsOfflineMode,
  } = useData();

  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-black rounded-full transition-all shadow-xs cursor-pointer ${
            firebaseSyncStatus === 'connected'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
              : firebaseSyncStatus === 'syncing'
              ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
              : 'bg-red-100 text-red-900 border border-red-300 hover:bg-red-200'
          }`}
          title="Firebase Cloud Firestore: marketing-management-app-fa004 (Click to manage sync)"
        >
          {firebaseSyncStatus === 'connected' ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-emerald-700" />
              <span>🟢 Firebase Connected</span>
            </>
          ) : firebaseSyncStatus === 'syncing' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-amber-700 animate-spin" />
              <span>🟡 Syncing...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-700" />
              <span>🔴 Offline / Local</span>
            </>
          )}
        </button>
      </div>

      <FirebaseSyncModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
