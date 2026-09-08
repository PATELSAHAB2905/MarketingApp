import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Flame,
  Shield,
  Smartphone,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  Mail,
} from 'lucide-react';

export default function LoginPage() {
  const {
    loginWithPassword,
    unlockAndResetWithMasterPassword,
    getAttemptsCount,
    isAccountLocked,
    adminProfile,
  } = useAuth();
  const { marketers = [] } = useData();

  const [activeTab, setActiveTab] = useState('MARKETER'); // 'MARKETER' | 'ADMIN'

  // Marketer Form State
  const [selectedMarketerId, setSelectedMarketerId] = useState(() => {
    return marketers[0]?.id || 'marketer-1';
  });
  const [marketerPassword, setMarketerPassword] = useState('');
  const [showMarketerPass, setShowMarketerPass] = useState(false);

  // Admin Form State (Requires Gmail ID / Email + Password)
  const [adminEmail, setAdminEmail] = useState('patelsahabspices@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Master Password Unlock Modal / State
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [newPasswordAfterUnlock, setNewPasswordAfterUnlock] = useState('');
  const [showMasterPass, setShowMasterPass] = useState(false);

  // UI Feedback
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Identify currently selected user key
  const activeUserKey = activeTab === 'ADMIN' ? 'admin-1' : selectedMarketerId;
  const currentMarketer = marketers.find((m) => m.id === selectedMarketerId) || marketers[0];
  const userLocked = isAccountLocked(activeUserKey);
  const attempts = getAttemptsCount(activeUserKey);

  // Handle Marketer Login
  const handleMarketerSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    const res = loginWithPassword({
      role: 'MARKETER',
      marketerId: selectedMarketerId,
      password: marketerPassword,
      marketersList: marketers,
    });

    setLoading(false);
    if (!res.success) {
      setErrorMessage(res.error);
    }
  };

  // Handle Admin Login (Gmail ID + Password)
  const handleAdminSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    const res = loginWithPassword({
      role: 'ADMIN',
      adminEmail: adminEmail.trim(),
      password: adminPassword,
    });

    setLoading(false);
    if (!res.success) {
      setErrorMessage(res.error);
    }
  };

  // Handle Master Password Unlock
  const handleMasterPasswordUnlock = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    const res = unlockAndResetWithMasterPassword({
      userKey: activeUserKey,
      masterPassword: masterPasswordInput,
      newPassword: newPasswordAfterUnlock,
      mobile: activeTab === 'ADMIN' ? adminProfile.mobile : currentMarketer?.mobile,
    });

    setLoading(false);
    if (res.success) {
      setSuccessMessage(res.message);
      setMasterPasswordInput('');
      setNewPasswordAfterUnlock('');
      setMarketerPassword('');
      setAdminPassword('');
    } else {
      setErrorMessage(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950 to-amber-950 flex flex-col justify-center items-center p-4 selection:bg-amber-500 selection:text-slate-950">
      {/* Background Glow Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 shadow-2xl shadow-amber-500/20 transform hover:scale-105 transition-transform duration-300 border border-amber-300/40">
            <Flame className="w-11 h-11 text-red-950 fill-amber-300 drop-shadow-md" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-amber-200 uppercase tracking-wider drop-shadow-sm">
              PATEL SAHAB SPICES
            </h1>
            <p className="text-xs text-red-200 font-semibold uppercase tracking-widest mt-1">
              Marketing Management Portal
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 md:p-8 space-y-6">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('MARKETER');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-3 px-4 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all ${
                activeTab === 'MARKETER'
                  ? 'bg-gradient-to-r from-red-700 to-red-800 text-white shadow-md shadow-red-700/20 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Marketer Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('ADMIN');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-3 px-4 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all ${
                activeTab === 'ADMIN'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-600/20 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin Login</span>
            </button>
          </div>

          {/* Alert Messages */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-xs font-semibold animate-shake">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">{successMessage}</div>
            </div>
          )}

          {/* 🔒 IF ACCOUNT IS LOCKED (>= 15 FAILED ATTEMPTS) */}
          {userLocked ? (
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-red-100/80 border-2 border-red-500 rounded-2xl text-center space-y-2">
                <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-600/30">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-black text-red-950 text-sm uppercase">ACCOUNT LOCKED</h3>
                <p className="text-xs text-red-800 font-medium">
                  Maximum 15 failed password attempts reached. Please enter the Master Password to unlock.
                </p>
              </div>

              <form onSubmit={handleMasterPasswordUnlock} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                    Master Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showMasterPass ? 'text' : 'password'}
                      required
                      placeholder="Enter Master Password"
                      value={masterPasswordInput}
                      onChange={(e) => setMasterPasswordInput(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-red-300 focus:border-red-600 rounded-2xl py-3 px-4 text-xs font-bold text-slate-900 pr-11 focus:outline-none focus:ring-4 focus:ring-red-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMasterPass(!showMasterPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showMasterPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Set New Password (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder="Leave empty to reset to default password"
                    value={newPasswordAfterUnlock}
                    onChange={(e) => setNewPasswordAfterUnlock(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-red-700 to-amber-600 hover:from-red-800 hover:to-amber-700 text-white font-black py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-red-700/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{loading ? 'Verifying...' : 'Unlock & Reset Password'}</span>
                </button>
              </form>
            </div>
          ) : activeTab === 'MARKETER' ? (
            /* 📱 MARKETER LOGIN FORM */
            <form onSubmit={handleMarketerSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Marketer Name / ID *</span>
                  <span className="text-slate-400 font-semibold lowercase">Select Your Name</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedMarketerId}
                    onChange={(e) => {
                      setSelectedMarketerId(e.target.value);
                      setErrorMessage('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-red-600 rounded-2xl py-3 px-4 text-xs font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-red-500/10 cursor-pointer appearance-none"
                  >
                    {marketers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-bold text-xs">
                    ▼
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showMarketerPass ? 'text' : 'password'}
                    required
                    placeholder="Enter Password"
                    value={marketerPassword}
                    onChange={(e) => setMarketerPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-red-600 rounded-2xl py-3 px-4 text-xs font-bold text-slate-900 pr-11 focus:outline-none focus:ring-4 focus:ring-red-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMarketerPass(!showMarketerPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showMarketerPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {attempts > 0 && attempts < 15 && (
                <div className="text-[11px] text-red-600 font-bold text-center">
                  ⚠️ Invalid attempts: {attempts} of 15 ({15 - attempts} remaining before lock)
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-700 via-red-800 to-red-900 hover:from-red-800 hover:to-red-950 text-white font-black py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-red-700/25 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>{loading ? 'Authenticating...' : 'Login to Marketer Portal'}</span>
              </button>
            </form>
          ) : (
            /* 👑 ADMIN LOGIN FORM (Gmail ID + Password) */
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 mb-1.5">
                  Admin Gmail ID / Email *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="e.g. patelsahab2905@gmail.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-600 rounded-2xl py-3 px-4 text-xs font-bold text-slate-900 pr-10 focus:outline-none focus:ring-4 focus:ring-amber-500/10"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 mb-1.5">
                  Admin Password *
                </label>
                <div className="relative">
                  <input
                    type={showAdminPass ? 'text' : 'password'}
                    required
                    placeholder="Enter Admin Password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-600 rounded-2xl py-3 px-4 text-xs font-bold text-slate-900 pr-11 focus:outline-none focus:ring-4 focus:ring-amber-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {attempts > 0 && attempts < 15 && (
                <div className="text-[11px] text-red-600 font-bold text-center">
                  ⚠️ Invalid attempts: {attempts} of 15 ({15 - attempts} remaining before lock)
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white font-black py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-amber-600/25 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                <span>{loading ? 'Authenticating Admin...' : 'Login to Admin Panel'}</span>
              </button>
            </form>
          )}

          {/* Footer Security Note */}
          <div className="pt-2 text-center border-t border-slate-100">
            <p className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Authorized Personnel Only • Secure Encrypted Session</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
