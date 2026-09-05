import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Users, Plus, Phone, Mail, CheckCircle2 } from 'lucide-react';

export default function MarketersMaster() {
  const { marketers, setMarketers, checkIns = [], getFormattedDate } = useData();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');

  const todayDate = getFormattedDate();

  const handleAddMarketer = (e) => {
    e.preventDefault();
    const newMkt = {
      id: `marketer-${Date.now()}`,
      name,
      mobile,
      email: email || `${name.toLowerCase().replace(' ', '')}@patelsahab.com`,
      active: true,
      joinedDate: todayDate,
    };
    setMarketers([...marketers, newMkt]);
    setShowModal(false);
    setName('');
    setMobile('');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">MARKETERS MASTER DATABASE</h1>
          <p className="text-xs text-slate-500 font-medium">Field sales executive profiles and active status (Based on Start My Day)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-md"
        >
          <Plus className="w-4 h-4" />
          ADD NEW MARKETER
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {marketers.map((m) => {
          const todayCheckIn = checkIns.find(
            (c) => c.marketerId === m.id && (c.date === todayDate || c.createdDate === todayDate)
          );
          const isActiveToday = Boolean(todayCheckIn && todayCheckIn.status === 'ACTIVE' && !todayCheckIn.endTime && !todayCheckIn.isDayEnded);
          const isEndedToday = Boolean(todayCheckIn && (todayCheckIn.status === 'INACTIVE' || todayCheckIn.endTime || todayCheckIn.isDayEnded));
          const startTime = todayCheckIn?.startTime || todayCheckIn?.createdTime || '—';
          const endTime = todayCheckIn?.endTime || todayCheckIn?.endedTime || '—';

          return (
            <div key={m.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{m.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">{m.email}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 ${
                    isActiveToday
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                      : 'bg-slate-100 text-slate-500 border-slate-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActiveToday ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span>{isActiveToday ? 'ACTIVE' : 'INACTIVE'}</span>
                </span>
              </div>

              {/* Attendance Timing Details */}
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Latest Start</span>
                  <span className="font-extrabold text-slate-800">{startTime}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Latest End</span>
                  <span className={`font-extrabold ${isEndedToday ? 'text-red-700' : 'text-slate-800'}`}>{endTime}</span>
                </div>
              </div>

              {/* Sessions History List if multiple */}
              {todayCheckIn?.sessions && todayCheckIn.sessions.length > 0 && (
                <div className="bg-slate-50/70 p-2 rounded-xl border border-slate-100 text-[11px] space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Today's Sessions ({todayCheckIn.sessions.length}):</span>
                  {todayCheckIn.sessions.map((sess, sIdx) => (
                    <div key={sIdx} className="flex justify-between items-center text-slate-700">
                      <span className="font-bold">Session {sess.sessionNumber || sIdx + 1}:</span>
                      <span>
                        {sess.startTime} → {sess.endTime ? sess.endTime : <strong className="text-emerald-700">Active 🟢</strong>}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-xs text-slate-700 space-y-1 pt-1">
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mobile: <strong>{m.mobile}</strong></span>
                </p>
                <p className="text-[11px] text-slate-400">Joined: {m.joinedDate || '01-01-2025'}</p>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <h2 className="text-xl font-black text-slate-900">ADD MARKETER</h2>
            <form onSubmit={handleAddMarketer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-slate-100 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-red-700 text-white font-bold rounded-xl"
                >
                  Save Marketer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
