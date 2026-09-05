import React from 'react';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/common/StatusBadge';
import { CalendarDays, Store, ShoppingBag, IndianRupee, RotateCcw, Clock } from 'lucide-react';

export default function DailyActivity() {
  const { visits, orders, collections, returns } = useData();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">DAILY MARKETING ACTIVITY AUDIT</h1>
          <p className="text-xs text-slate-500 font-medium">Complete chronological feed of today's field actions</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h2 className="text-sm font-black text-slate-900 uppercase">TODAY'S SHOP VISITS LOG ({visits.length} Visits)</h2>
        <div className="space-y-3">
          {visits.length === 0 ? (
            <p className="text-xs text-slate-400 font-semibold py-4 text-center">No shop visits recorded today yet.</p>
          ) : (
            visits.map((v) => (
              <div key={v.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{v.shopName}</h3>
                  <p className="text-slate-500">
                    Marketer: <strong>{v.marketerName}</strong> • Market: <span className="uppercase">{v.marketId}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-700 block">{v.time}</span>
                  <div className="flex gap-1 mt-1">
                    {v.outcomes?.map((o, idx) => (
                      <span key={idx} className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded">
                        {o}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
