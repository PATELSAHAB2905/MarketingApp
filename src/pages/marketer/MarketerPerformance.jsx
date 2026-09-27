import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import MarketerTargetPacingCard from '../../components/common/MarketerTargetPacingCard';
import { Award, TrendingUp, ShoppingBag, IndianRupee, Store, RotateCcw, Target, Calendar } from 'lucide-react';

export default function MarketerPerformance() {
  const { currentUser } = useAuth();
  const { orders = [], collections = [], returns = [], visits = [], getFormattedDate } = useData();
  const [timeframe, setTimeframe] = useState('This Month');

  const todayStr = getFormattedDate();
  const currentMonth = todayStr.substring(3); // e.g. "09-2026"

  // Live order/sales calculation for this marketer
  const myOrders = orders.filter((o) => {
    if (o.marketerId !== currentUser?.id) return false;
    if (o.status === 'Cancelled' || o.status === 'Deleted') return false;
    const d = o.date || o.createdDate || '';
    if (timeframe === 'Today') return d === todayStr;
    if (timeframe === 'This Month') return d.endsWith(currentMonth);
    return true; // 'All Time'
  });

  const myCollections = collections.filter((c) => {
    if (c.marketerId !== currentUser?.id) return false;
    const d = c.date || c.createdDate || '';
    if (timeframe === 'Today') return d === todayStr;
    if (timeframe === 'This Month') return d.endsWith(currentMonth);
    return true;
  });

  const myReturns = returns.filter((r) => {
    if (r.marketerId !== currentUser?.id) return false;
    const d = r.date || r.createdDate || '';
    if (timeframe === 'Today') return d === todayStr;
    if (timeframe === 'This Month') return d.endsWith(currentMonth);
    return true;
  });

  const myVisits = visits.filter((v) => {
    if (v.marketerId !== currentUser?.id) return false;
    const d = v.date || v.createdDate || '';
    if (timeframe === 'Today') return d === todayStr;
    if (timeframe === 'This Month') return d.endsWith(currentMonth);
    return true;
  });

  const totalKg = myOrders.reduce((s, o) => s + (Number(o.totalKg) || 0), 0);
  const totalValue = myOrders.reduce((s, o) => s + (Number(o.grandTotal || o.totalValue) || 0), 0);
  const totalCollection = myCollections.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const totalReturnsVal = myReturns.reduce((s, r) => s + (Number(r.returnValue) || 0), 0);
  const totalVisitsCount = myVisits.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">MY PERFORMANCE & TARGETS</h2>
          <p className="text-xs text-slate-500 font-medium">{currentUser?.name} • Real-time Marketer Performance</p>
        </div>
      </div>

      {/* 1. Complete Monthly Target & Pacing Card */}
      <MarketerTargetPacingCard marketerId={currentUser?.id} initialMonth="September 2026" />

      {/* 2. Operational KPIs */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
            OPERATIONAL TRANSACTIONS ({timeframe.toUpperCase()})
          </h3>
          <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-bold">
            {['Today', 'This Month', 'All Time'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  timeframe === tf ? 'bg-red-700 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-red-700 mb-1">
              <ShoppingBag className="w-4 h-4" />
              <span className="font-bold uppercase text-[10px]">Sales Value</span>
            </div>
            <p className="text-xl font-black text-slate-900">₹{totalValue.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-400 mt-1">{totalKg} KG Total Dispatched</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-emerald-700 mb-1">
              <IndianRupee className="w-4 h-4" />
              <span className="font-bold uppercase text-[10px]">Collection</span>
            </div>
            <p className="text-xl font-black text-emerald-800">₹{totalCollection.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-emerald-600 font-medium mt-1">{myCollections.length} Payment Receipts</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-amber-700 mb-1">
              <Store className="w-4 h-4" />
              <span className="font-bold uppercase text-[10px]">Shops Visited</span>
            </div>
            <p className="text-xl font-black text-slate-900">{totalVisitsCount} Visits</p>
            <p className="text-[10px] text-slate-400 mt-1">Field market visits</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <RotateCcw className="w-4 h-4" />
              <span className="font-bold uppercase text-[10px]">Returns Value</span>
            </div>
            <p className="text-xl font-black text-slate-900">₹{totalReturnsVal.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-400 mt-1">{myReturns.length} Return Incidents</p>
          </div>
        </div>
      </div>
    </div>
  );
}
