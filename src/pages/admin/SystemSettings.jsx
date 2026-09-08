import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { getFirebaseConfig, saveFirebaseConfig } from '../../services/firebase';
import ChangePasswordModal from '../../components/common/ChangePasswordModal';
import {
  Settings,
  Shield,
  Flame,
  RefreshCw,
  CheckCircle2,
  Clock,
  Percent,
  KeyRound,
  Phone,
  Lock,
  User,
} from 'lucide-react';

export default function SystemSettings() {
  const { gstConfig, setGstConfig, creditPolicy, setCreditPolicy, resetToSeedData } = useData();
  const { currentUser, adminProfile, updateAdminProfile } = useAuth();

  const [showPassModal, setShowPassModal] = useState(false);
  const [fbConfig, setFbConfig] = useState(getFirebaseConfig());
  const [savedFb, setSavedFb] = useState(false);

  // Admin Profile Edit State
  const [adminName, setAdminName] = useState(adminProfile?.name || 'Patel Sahab Management');
  const [adminMobile, setAdminMobile] = useState(adminProfile?.mobile || '9826022905');
  const [adminEmail, setAdminEmail] = useState(adminProfile?.email || 'patelsahab2905@gmail.com');
  const [savedAdminProfile, setSavedAdminProfile] = useState(false);

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
    alert('GST & Tax Credit Policy saved successfully ✓');
  };

  const handleSaveAdminProfile = (e) => {
    e.preventDefault();
    updateAdminProfile({
      name: adminName.trim(),
      mobile: adminMobile.trim(),
      email: adminEmail.trim(),
    });
    setSavedAdminProfile(true);
    setTimeout(() => setSavedAdminProfile(false), 3000);
  };

  const handleSaveFirebase = (e) => {
    e.preventDefault();
    saveFirebaseConfig(fbConfig);
    setSavedFb(true);
    setTimeout(() => setSavedFb(false), 3000);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 uppercase">
          SYSTEM SETTINGS & SECURITY
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Manage Admin Profile, Passwords, GST tax policies, and system parameters
        </p>
      </div>

      {/* 1. Admin Security & Profile Management */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-600" />
          ADMIN PROFILE & SECURITY SETTINGS
        </h2>

        <form onSubmit={handleSaveAdminProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Admin Name
              </label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Admin Mobile Number
              </label>
              <input
                type="tel"
                required
                value={adminMobile}
                onChange={(e) => setAdminMobile(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Admin Gmail ID / Email
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs shadow-md"
            >
              Save Admin Profile
            </button>

            <button
              type="button"
              onClick={() => setShowPassModal(true)}
              className="py-2.5 px-5 bg-slate-900 hover:bg-black text-amber-300 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md"
            >
              <KeyRound className="w-4 h-4" />
              <span>Change Admin Password</span>
            </button>

            {savedAdminProfile && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Profile Updated ✓
              </span>
            )}
          </div>
        </form>

        {/* Master Password Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs space-y-1">
          <p className="font-extrabold text-amber-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-700" />
            <span>Master Password Security (Immutable):</span>
          </p>
          <p className="text-slate-600 pl-6">
            The emergency Master Password <strong>Patel@2905</strong> can be used to unlock and reset any locked user account after 15 consecutive failed attempts.
          </p>
        </div>
      </div>

      {/* 2. GST & Tax Policy Configuration */}
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
                className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">GST Calculation Mode</label>
              <select
                value={gstMode}
                onChange={(e) => setGstMode(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
              >
                <option value="Exclusive">Exclusive (Tax added on top)</option>
                <option value="Inclusive">Inclusive (Price includes Tax)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Default Credit Period (Days)</label>
              <input
                type="number"
                value={creditDays}
                onChange={(e) => setCreditDays(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            className="py-3 px-6 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl text-xs shadow-md"
          >
            SAVE TAX & CREDIT POLICY
          </button>
        </form>
      </div>

      {/* 3. Firebase Configuration */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-600" />
          FIREBASE CLOUD FIRESTORE CONFIG
        </h2>

        <form onSubmit={handleSaveFirebase} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">API Key</label>
            <input
              type="text"
              value={fbConfig.apiKey}
              onChange={(e) => setFbConfig({ ...fbConfig, apiKey: e.target.value })}
              className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Project ID</label>
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

      {/* 4. Reset System Data */}
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

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPassModal}
        onClose={() => setShowPassModal(false)}
      />
    </div>
  );
}
