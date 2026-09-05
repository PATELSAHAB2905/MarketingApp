import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UploadCloud,
  X,
  Database,
  Layers,
  Check,
  ShieldCheck,
} from 'lucide-react';

export default function FirebaseSyncModal({ isOpen, onClose }) {
  const {
    isFirebaseConnected,
    firebaseSyncStatus,
    firebaseError,
    lastSyncedTime,
    isMigrating,
    pushAllDataToFirebase,
    refreshFromFirebase,
    markets,
    marketers,
    shops,
    orders,
    collections,
    returns,
    marketRoutes,
    connectedMarkets,
    checkIns,
    targets,
    auditLogs,
    importBatches,
  } = useData();

  const [migrationResult, setMigrationResult] = useState(null);
  const [inProgress, setInProgress] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const totalLocalRecords =
    (markets?.length || 0) +
    (marketers?.length || 0) +
    (shops?.length || 0) +
    (orders?.length || 0) +
    (collections?.length || 0) +
    (returns?.length || 0) +
    (marketRoutes?.length || 0) +
    (connectedMarkets?.length || 0) +
    (checkIns?.length || 0) +
    (targets?.length || 0) +
    (importBatches?.length || 0) +
    (auditLogs?.length || 0);

  const handlePushMigration = async () => {
    setInProgress(true);
    setErrorMsg('');
    try {
      const summary = await pushAllDataToFirebase();
      setMigrationResult(summary);
    } catch (err) {
      setErrorMsg(err.message || 'Migration failed. Please check network/rules.');
    } finally {
      setInProgress(false);
    }
  };

  const handlePullRefresh = async () => {
    setInProgress(true);
    setErrorMsg('');
    try {
      await refreshFromFirebase();
      alert('Cloud Firestore sync complete!');
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Fetch failed.');
    } finally {
      setInProgress(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl p-6 space-y-5 text-slate-800 border border-slate-200">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                FIREBASE CLOUD FIRESTORE
              </h2>
              <p className="text-[11px] text-slate-500 font-bold">
                Project: <code className="text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded">marketing-management-app-fa004</code>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Pill */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                firebaseSyncStatus === 'connected'
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-400 animate-pulse'
                  : firebaseSyncStatus === 'syncing'
                  ? 'bg-amber-400 animate-spin'
                  : 'bg-red-500'
              }`}
            />
            <span className="font-extrabold text-slate-800">
              {firebaseSyncStatus === 'connected'
                ? '🟢 Firebase Cloud Connected'
                : firebaseSyncStatus === 'syncing'
                ? '🟡 Syncing with Firestore...'
                : '🔴 Offline / Local Storage Fallback'}
            </span>
          </div>

          {lastSyncedTime && (
            <span className="text-[10px] text-slate-500 font-semibold">
              Last Sync: {lastSyncedTime}
            </span>
          )}
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-2xl flex items-start gap-2 text-xs text-red-800 font-semibold">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Local Data Summary Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-black text-slate-900 uppercase">
              Current Local Database Records ({totalLocalRecords})
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">Ready for Cloud Sync</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Shops / Parties</span>
              <span className="text-base font-black text-slate-900">{shops?.length || 0}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Orders</span>
              <span className="text-base font-black text-red-700">{orders?.length || 0}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Collections</span>
              <span className="text-base font-black text-emerald-700">{collections?.length || 0}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Returns</span>
              <span className="text-base font-black text-amber-700">{returns?.length || 0}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Markets</span>
              <span className="text-base font-black text-slate-800">{markets?.length || 0}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Marketers</span>
              <span className="text-base font-black text-slate-800">{marketers?.length || 0}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Routes</span>
              <span className="text-base font-black text-slate-800">{marketRoutes?.length || 0}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Import Batches</span>
              <span className="text-base font-black text-purple-700">{importBatches?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Success Result */}
        {migrationResult && (
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-xs space-y-1 text-emerald-950">
            <div className="flex items-center gap-1.5 font-black text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Migration Completed Successfully!</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Total <strong>{migrationResult.totalRecords}</strong> documents upserted to Firebase Cloud Firestore without duplicates.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={handlePullRefresh}
            disabled={inProgress || isMigrating}
            className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${inProgress ? 'animate-spin' : ''}`} />
            <span>Sync with Firebase</span>
          </button>

          <button
            onClick={handlePushMigration}
            disabled={inProgress || isMigrating}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{inProgress || isMigrating ? 'Uploading to Firebase...' : 'Push All Data to Firebase'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
