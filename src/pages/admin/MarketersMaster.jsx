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
  LogOut,
  Power,
  Clock,
  AlertTriangle,
  Activity,
  Check,
} from 'lucide-react';

export default function MarketersMaster() {
  const { marketers, setMarketers, checkIns = [], getFormattedDate, adminEndMarketerDay } = useData();
  const { adminResetMarketerPassword, onMarketerMobileChanged, adminForceLogoutMarketer, activeSessions = {} } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMarketer, setEditingMarketer] = useState(null);

  // Admin remote modal states
  const [forceLogoutTarget, setForceLogoutTarget] = useState(null);
  const [endDayTarget, setEndDayTarget] = useState(null);
  const [endDayReason, setEndDayReason] = useState('Field shift completed');
  const [customEndReason, setCustomEndReason] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');

  const todayDate = getFormattedDate();

  const presetReasons = [
    'Field shift completed',
    'Marketer left market early',
    'Emergency / Personal illness',
    'Device battery / connectivity issue',
    'Administrative decision',
  ];

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
    onMarketerMobileChanged(newMkt.id, cleanMobile);

    setShowAddModal(false);
    setName('');
    setMobile('');
    setEmail('');
  };

  const handleEditMarketer = (e) => {
    e.preventDefault();
    if (!editingMarketer) return;
    const cleanMobile = mobile.trim();
    const isMobileChanged = editingMarketer.mobile !== cleanMobile;

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

    // If mobile number changed, automatically reset password to last 4 digits
    if (isMobileChanged) {
      onMarketerMobileChanged(editingMarketer.id, cleanMobile);
      const newLast4 = cleanMobile.length >= 4 ? cleanMobile.slice(-4) : cleanMobile;
      alert(`Mobile number updated to ${cleanMobile}.\nLogin password has been automatically reset to: ${newLast4}`);
    }

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

  // Confirm Force Logout
  const executeForceLogout = () => {
    if (!forceLogoutTarget) return;
    adminForceLogoutMarketer(forceLogoutTarget.id, forceLogoutTarget.name);
    alert(`Force logout successfully executed for ${forceLogoutTarget.name}.`);
    setForceLogoutTarget(null);
  };

  // Confirm Remote End Day
  const executeEndDay = () => {
    if (!endDayTarget) return;
    const reasonToSave = endDayReason === 'Other' ? (customEndReason.trim() || 'Admin Remote End Day') : endDayReason;
    adminEndMarketerDay({
      marketerId: endDayTarget.id,
      marketerName: endDayTarget.name,
      reason: reasonToSave,
      date: todayDate,
    });
    alert(`Active day session successfully ended for ${endDayTarget.name}.\nReason: ${reasonToSave}`);
    setEndDayTarget(null);
    setCustomEndReason('');
  };

  // Calculate live counts
  const totalCount = marketers.length;
  const loggedInCount = marketers.filter((m) => activeSessions[m.id]?.loginStatus === 'LOGGED_IN').length;
  const activeDayCount = marketers.filter((m) => {
    const chk = checkIns.find((c) => c.marketerId === m.id && (c.date === todayDate || c.createdDate === todayDate));
    return Boolean(chk && chk.status === 'ACTIVE' && !chk.endTime && !chk.isDayEnded);
  }).length;
  const endedDayCount = marketers.filter((m) => {
    const chk = checkIns.find((c) => c.marketerId === m.id && (c.date === todayDate || c.createdDate === todayDate));
    return Boolean(chk && (chk.status === 'INACTIVE' || chk.endTime || chk.isDayEnded));
  }).length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase">
            MARKETERS MASTER & SESSION CONTROL
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Field sales executive profiles, credentials & live session management
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

      {/* Live Session Status Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Marketers</span>
          <p className="text-2xl font-black text-slate-900 mt-0.5">{totalCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase block">Logged In (App Active)</span>
          <p className="text-2xl font-black text-emerald-600 mt-0.5 flex items-center gap-2">
            <span>{loggedInCount}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase block">Day Active (Field Work)</span>
          <p className="text-2xl font-black text-amber-700 mt-0.5">{activeDayCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Day Ended / Handover</span>
          <p className="text-2xl font-black text-slate-700 mt-0.5">{endedDayCount}</p>
        </div>
      </div>

      {/* Marketers Grid & Session Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {marketers.map((m) => {
          const todayCheckIn = checkIns.find(
            (c) => c.marketerId === m.id && (c.date === todayDate || c.createdDate === todayDate)
          );
          const isDayActive = Boolean(
            todayCheckIn && todayCheckIn.status === 'ACTIVE' && !todayCheckIn.endTime && !todayCheckIn.isDayEnded
          );
          const isDayEnded = Boolean(
            todayCheckIn && (todayCheckIn.status === 'INACTIVE' || todayCheckIn.endTime || todayCheckIn.isDayEnded)
          );

          const session = activeSessions[m.id];
          const isLoggedIn = session?.loginStatus === 'LOGGED_IN';
          const defaultPass = m.mobile && m.mobile.length >= 4 ? m.mobile.slice(-4) : '1234';

          return (
            <div
              key={m.id}
              className={`bg-white p-5 rounded-3xl border shadow-xs space-y-3.5 relative hover:shadow-md transition-shadow ${
                isDayActive ? 'border-amber-300 ring-1 ring-amber-300/30' : 'border-slate-200'
              }`}
            >
              {/* Profile Top */}
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{m.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">{m.email}</p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {/* Login Pill */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${
                      isLoggedIn
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isLoggedIn ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span>{isLoggedIn ? 'LOGGED IN' : 'LOGGED OUT'}</span>
                  </span>

                  {/* Day Status Pill */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${
                      isDayActive
                        ? 'bg-amber-100 text-amber-950 border-amber-300'
                        : isDayEnded
                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >
                    <span>{isDayActive ? 'DAY ACTIVE 🟢' : isDayEnded ? 'DAY ENDED ⚪' : 'NOT STARTED'}</span>
                  </span>
                </div>
              </div>

              {/* Timing & Mobile Info */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5 font-bold text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Registered Mobile:
                  </span>
                  <span className="font-extrabold text-slate-900 text-xs">
                    {m.mobile || 'Not Configured'}
                  </span>
                </div>

                {/* Day Timings */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                  <span className="text-slate-500 font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Today's Session:
                  </span>
                  <span className="font-extrabold text-slate-800">
                    {todayCheckIn
                      ? `Start: ${todayCheckIn.startTime || todayCheckIn.createdTime}${todayCheckIn.endTime ? ` • End: ${todayCheckIn.endTime}` : ''}`
                      : 'No session today'}
                  </span>
                </div>

                {/* Password Info Badge */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                  <span className="text-slate-600 font-bold flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    Default Password:
                  </span>
                  <span className="bg-amber-100 text-amber-950 font-black px-2 py-0.5 rounded-lg border border-amber-300">
                    Last 4 Digits ({defaultPass})
                  </span>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openEditModal(m)}
                    className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Profile</span>
                  </button>

                  <button
                    onClick={() => handleResetPassword(m)}
                    className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    title="Reset password to default (last 4 digits of mobile)"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                    <span>Reset Pass</span>
                  </button>
                </div>

                {/* Admin Session Remote Controls */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  {/* End Active Day Button */}
                  <button
                    disabled={!isDayActive}
                    onClick={() => {
                      setEndDayTarget(m);
                      setEndDayReason('Field shift completed');
                      setCustomEndReason('');
                    }}
                    className={`py-2 px-2.5 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all ${
                      isDayActive
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs active:scale-95'
                        : 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed'
                    }`}
                    title={isDayActive ? 'Remotely close this marketer active day' : 'Marketer day is not active'}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>End Day</span>
                  </button>

                  {/* Force Logout Button */}
                  <button
                    disabled={!isLoggedIn}
                    onClick={() => setForceLogoutTarget(m)}
                    className={`py-2 px-2.5 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all ${
                      isLoggedIn
                        ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 shadow-xs active:scale-95'
                        : 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed'
                    }`}
                    title={isLoggedIn ? 'Remotely invalidate session and log out' : 'Marketer is already logged out'}
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-600" />
                    <span>Force Logout</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FORCE LOGOUT CONFIRMATION MODAL */}
      {forceLogoutTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-200">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 uppercase">Confirm Force Logout</h3>
              <p className="text-xs text-slate-600 font-medium">
                Are you sure you want to force logout <strong>{forceLogoutTarget.name}</strong>?
              </p>
              <p className="text-[11px] text-red-700 font-semibold bg-red-50 p-2 rounded-xl border border-red-200 mt-2">
                Their active mobile session will be terminated immediately.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setForceLogoutTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeForceLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md active:scale-95"
              >
                Force Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REMOTE END DAY CONFIRMATION MODAL */}
      {endDayTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  <Power className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">Remote End Day</h3>
                  <p className="text-[10px] text-slate-500 font-medium">{endDayTarget.name}</p>
                </div>
              </div>
              <button onClick={() => setEndDayTarget(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 font-medium">
                Select reason for closing this marketer's active day session:
              </p>

              <div className="space-y-1.5">
                {presetReasons.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setEndDayReason(r)}
                    className={`w-full p-2.5 rounded-xl text-left font-bold text-xs border transition-all flex items-center justify-between ${
                      endDayReason === r
                        ? 'bg-amber-500/15 border-amber-500 text-amber-950 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{r}</span>
                    {endDayReason === r && <Check className="w-3.5 h-3.5 text-amber-700" />}
                  </button>
                ))}
              </div>

              {endDayReason === 'Other' && (
                <input
                  type="text"
                  value={customEndReason}
                  onChange={(e) => setCustomEndReason(e.target.value)}
                  placeholder="Enter custom reason..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
                />
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEndDayTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeEndDay}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md active:scale-95"
              >
                End Active Day
              </button>
            </div>
          </div>
        </div>
      )}

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
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingMarketer ? handleEditMarketer : handleAddMarketer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mobile Number (10 Digits) *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 9826012345"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-600"
                />
                <p className="text-[10px] text-amber-700 font-semibold mt-1">
                  🔑 Default login password will be set to the last 4 digits of this mobile number.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Official Email (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ramesh@patelsahab.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingMarketer(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-red-700 hover:bg-red-800 text-white font-black text-xs shadow-md"
                >
                  {editingMarketer ? 'Save Profile' : 'Add Marketer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
