import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Plus,
  Phone,
  Mail,
  CheckCircle2,
  KeyRound,
  Edit,
  RotateCcw,
  Shield,
  X,
} from 'lucide-react';

export default function MarketersMaster() {
  const { marketers, setMarketers, checkIns = [], getFormattedDate } = useData();
  const { adminResetMarketerPassword } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMarketer, setEditingMarketer] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');

  const todayDate = getFormattedDate();

  const handleAddMarketer = (e) => {
    e.preventDefault();
    const cleanMobile = mobile.trim();
    const newMkt = {
      id: `marketer-${Date.now()}`,
      name: name.trim(),
      mobile: cleanMobile,
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@patelsahab.com`,
      active: true,
      joinedDate: todayDate,
    };
    setMarketers([...marketers, newMkt]);
    setShowAddModal(false);
    setName('');
    setMobile('');
    setEmail('');
  };

  const handleEditMarketer = (e) => {
    e.preventDefault();
    if (!editingMarketer) return;
    const cleanMobile = mobile.trim();
    setMarketers((prev) =>
      prev.map((m) =>
        m.id === editingMarketer.id
          ? {
              ...m,
              name: name.trim(),
              mobile: cleanMobile,
              email: email.trim() || m.email,
            }
          : m
      )
    );
    setEditingMarketer(null);
    setName('');
    setMobile('');
    setEmail('');
  };

  const openEditModal = (mkt) => {
    setEditingMarketer(mkt);
    setName(mkt.name || '');
    setMobile(mkt.mobile || '');
    setEmail(mkt.email || '');
  };

  const handleResetPassword = (mkt) => {
    const last4 = mkt.mobile ? mkt.mobile.slice(-4) : '1234';
    if (
      window.confirm(
        `Are you sure you want to reset the password for ${mkt.name}?\nAfter reset, the default password will be "${last4}" (last 4 digits of registered mobile).`
      )
    ) {
      adminResetMarketerPassword(mkt.id);
      alert(`Password has been reset successfully! Default password is: ${last4}`);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase">
            MARKETERS MASTER DATABASE
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Field sales executive profiles, contact numbers & account management
          </p>
        </div>
        <button
          onClick={() => {
            setName('');
            setMobile('');
            setEmail('');
            setShowAddModal(true);
          }}
          className="px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-md shadow-red-700/20 active:scale-98 transition-all"
        >
          <Plus className="w-4 h-4" />
          ADD NEW MARKETER
        </button>
      </div>

      {/* Marketers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {marketers.map((m) => {
          const todayCheckIn = checkIns.find(
            (c) => c.marketerId === m.id && (c.date === todayDate || c.createdDate === todayDate)
          );
          const isActiveToday = Boolean(
            todayCheckIn && todayCheckIn.status === 'ACTIVE' && !todayCheckIn.endTime && !todayCheckIn.isDayEnded
          );
          const defaultPass = m.mobile && m.mobile.length >= 4 ? m.mobile.slice(-4) : '1234';

          return (
            <div
              key={m.id}
              className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3 relative hover:shadow-md transition-shadow"
            >
              {/* Profile Top */}
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{m.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">{m.email}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-black border flex items-center gap-1.5 ${
                    isActiveToday
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-500 border-slate-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActiveToday ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  <span>{isActiveToday ? 'ACTIVE 🟢' : 'INACTIVE'}</span>
                </span>
              </div>

              {/* Mobile Number & Contact */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5 font-bold text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Mobile Number:
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {m.mobile || 'Not Configured'}
                  </span>
                </div>

                {/* Password Info Badge */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                  <span className="text-slate-600 font-bold flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    Initial Password:
                  </span>
                  <span className="bg-amber-100 text-amber-950 font-black px-2 py-0.5 rounded-lg border border-amber-300">
                    {defaultPass}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => openEditModal(m)}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit Profile</span>
                </button>

                <button
                  onClick={() => handleResetPassword(m)}
                  className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-[11px] rounded-xl border border-red-200 flex items-center justify-center gap-1.5 transition-colors"
                  title="Reset password to default (last 4 digits of mobile)"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                  <span>Reset Pass</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD / EDIT MARKETER MODAL */}
      {(showAddModal || editingMarketer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900 uppercase">
                {editingMarketer ? 'EDIT MARKETER PROFILE' : 'ADD NEW MARKETER'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingMarketer(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={editingMarketer ? handleEditMarketer : handleAddMarketer}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 font-bold focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Mobile Number (10 Digits) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9826012345"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 font-bold text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-red-600"
                />
                {mobile.length >= 4 && (
                  <p className="text-[11px] text-amber-900 font-bold mt-1 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    🔑 Initial login password for this marketer will be: <strong>{mobile.slice(-4)}</strong>.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. ramesh@patelsahab.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 font-bold focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingMarketer(null);
                  }}
                  className="flex-1 py-3 bg-slate-100 font-bold text-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-red-700 to-red-800 text-white font-extrabold rounded-xl shadow-md"
                >
                  {editingMarketer ? 'Update Profile' : 'Save Marketer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
