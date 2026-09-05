import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { getFirebaseConfig, saveFirebaseConfig } from '../../services/firebase';
import { Settings, Shield, Flame, RefreshCw, CheckCircle2, Clock, Percent } from 'lucide-react';

export default function SystemSettings() {
  const { gstConfig, setGstConfig, creditPolicy, setCreditPolicy, resetToSeedData } = useData();

  const [fbConfig, setFbConfig] = useState(getFirebaseConfig());
  const [savedFb, setSavedFb] = useState(false);

  // GST & Policy states
  const [gstEnabled, setGstEnabled] = useState(gstConfig?.gstEnabled ?? true);
  const [gstRate, setGstRate] = useState(gstConfig?.gstRate || 5);
  const [gstMode, setGstMode] = useState(gstConfig?.gstMode || 'Exclusive');
  const [creditDays, setCreditDays] = useState(creditPolicy?.creditPeriodDays || 21);

  const handleSaveTaxPolicy = (e) => {
    e.preventDefault();
    setGstConfig({
      gstEnabled,
      gstRate: Number(gstRate),
      gstMode,
    });
    setCreditPolicy({
      creditPeriodDays: Number(creditDays),
    });
    alert('GST & TAX CREDIT POLICY SAVED ✓');
  };

  const handleSaveFirebase = (e) => {
    e.preventDefault();
    saveFirebaseConfig(fbConfig);
    setSavedFb(true);
    setTimeout(() => setSavedFb(false), 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 uppercase">SYSTEM SETTINGS & TAX CONFIGURATION</h1>
        <p className="text-xs text-slate-500 font-medium">Manage GST policies, 21-day credit period rules, and application parameters</p>
      </div>

      {/* 1. GST & Tax Policy Configuration (Rule 9 & 11) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
          <Percent className="w-5 h-5 text-emerald-600" />
          GST TAX CONFIGURATION & CREDIT PERIOD POLICY
        </h2>

        <form onSubmit={handleSaveTaxPolicy} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">GST Tax Status</label>
              <select
                value={gstEnabled ? 'YES' : 'NO'}
                onChange={(e) => setGstEnabled(e.target.value === 'YES')}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
              >
                <option value="YES">GST Enabled (Yes)</option>
                <option value="NO">GST Disabled (No)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Default GST Rate (%)</label>
              <input
                type="number"
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-black text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">GST Mode</label>
              <select
                value={gstMode}
                onChange={(e) => setGstMode(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
              >
                <option value="Exclusive">Exclusive (Add GST on subtotal - Default)</option>
                <option value="Inclusive">Inclusive (GST included in price)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Credit Period Policy (Days)</label>
              <input
                type="number"
                value={creditDays}
                onChange={(e) => setCreditDays(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-black text-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            className="py-3 px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md"
          >
            SAVE TAX & CREDIT POLICY ✓
          </button>
        </form>
      </div>

      {/* 2. Firebase Configuration Panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-600" />
          FIREBASE DATABASE PARAMETERS
        </h2>

        <form onSubmit={handleSaveFirebase} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-600 mb-1">Firebase Project ID</label>
            <input
              type="text"
              value={fbConfig.projectId}
              onChange={(e) => setFbConfig({ ...fbConfig, projectId: e.target.value })}
              className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-xs"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              className="py-3 px-6 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs shadow-md"
            >
              SAVE FIREBASE CONFIG
            </button>
            {savedFb && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Saved!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Reset System Data */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
        <div>
          <p className="font-bold text-slate-800 text-xs">Reset System Data</p>
          <p className="text-[11px] text-slate-500">Restores default Patel Sahab Spices seed state</p>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Reset all data to default Patel Sahab Spices demo state?')) {
              resetToSeedData();
              window.location.reload();
            }
          }}
          className="px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" />
          Reset Data
        </button>
      </div>
    </div>
  );
}
