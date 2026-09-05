import React from 'react';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/common/StatusBadge';
import { Navigation, Clock, MapPin, Store, CheckCircle2 } from 'lucide-react';

export default function LiveTracking() {
  const { marketers, getFormattedDate, getTodayMarket, checkIns, visits } = useData();
  const todayDate = getFormattedDate();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">LIVE MARKETER TRACKING</h1>
          <p className="text-xs text-slate-500 font-medium">Real-time market position and shop visit progress</p>
        </div>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          Live GPS Feed Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {marketers.map((m) => {
          const todayMarket = getTodayMarket(m.id, todayDate);
          const chk = checkIns.find((c) => c.marketerId === m.id && (c.date === todayDate || c.createdDate === todayDate));
          const mVisits = visits.filter((v) => v.marketerId === m.id && (v.date === todayDate || v.createdDate === todayDate));
          const isActive = Boolean(chk && chk.status === 'ACTIVE' && !chk.endTime && !chk.isDayEnded);
          const isEnded = Boolean(chk && (chk.status === 'INACTIVE' || chk.endTime || chk.isDayEnded));

          return (
            <div key={m.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{m.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">{m.mobile}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-500 border-slate-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span>{isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Today's Market:</span>
                  <span className="font-black text-amber-800 uppercase">{todayMarket?.marketName || 'Pachore'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Start Time:</span>
                  <span className="font-bold text-slate-800">{chk ? (chk.startTime || chk.createdTime) : 'Not Started'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">End Time:</span>
                  <span className={`font-bold ${isEnded ? 'text-red-700' : 'text-slate-500'}`}>{isEnded ? chk.endTime : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Shops Visited:</span>
                  <span className="font-black text-emerald-700">{mVisits.length} / 30 Visited</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center gap-2 text-xs text-amber-900">
                <MapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>Last GPS Update: <strong>Main Market Square, {todayMarket?.marketName || 'Pachore'}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
