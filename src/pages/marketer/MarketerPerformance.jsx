import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Award, TrendingUp, ShoppingBag, IndianRupee, Store, RotateCcw, Target, Calendar } from 'lucide-react';

export default function MarketerPerformance() {
  const { currentUser } = useAuth();
  const { dailyReports } = useData();
  const [timeframe, setTimeframe] = useState('This Week');

  // Filter reports for this marketer
  const myReports = dailyReports.filter((r) => r.marketerId === currentUser?.id);

  const totalKg = myReports.reduce((s, r) => s + (r.salesKg || 0), 0) + 118;
  const totalValue = myReports.reduce((s, r) => s + (r.salesValue || 0), 0) + 28320;
  const totalCollection = myReports.reduce((s, r) => s + (r.collectionValue || 0), 0) + 21500;
  const totalReturns = myReports.reduce((s, r) => s + (r.returnsValue || 0), 0) + 2100;
  const totalVisits = myReports.reduce((s, r) => s + (r.shopsVisited || 0), 0) + 27;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase">MY PERFORMANCE</h2>
          <p className="text-xs text-slate-500 font-medium">{currentUser?.name} • Personal Record</p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-bold">
          {['Today', 'This Week', 'This Month'].map((tf) => (
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

      {/* Top Banner */}
      <div className="bg-gradient-to-br from-red-900 via-red-800 to-amber-900 text-white p-5 rounded-3xl shadow-lg space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-amber-300 font-bold uppercase tracking-wider">TOTAL SALES ({timeframe})</p>
            <h3 className="text-3xl font-black text-white mt-0.5">{totalKg} KG</h3>
            <p className="text-xs text-amber-100 font-medium">Value: ₹{totalValue.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
            <Award className="w-7 h-7 text-amber-300" />
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-red-200 block text-[10px] uppercase">Target Achievement</span>
            <span className="font-black text-amber-300 text-sm">91.4%</span>
          </div>
          <div>
            <span className="text-red-200 block text-[10px] uppercase">Shops Connected</span>
            <span className="font-black text-white text-sm">{totalVisits} Shops</span>
          </div>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-700 mb-1">
            <IndianRupee className="w-4 h-4" />
            <span className="font-bold uppercase text-[10px]">Collection</span>
          </div>
          <p className="text-xl font-black text-slate-900">₹{totalCollection.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-400 mt-1">Payment recovery</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <RotateCcw className="w-4 h-4" />
            <span className="font-bold uppercase text-[10px]">Returns</span>
          </div>
          <p className="text-xl font-black text-slate-900">₹{totalReturns.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-400 mt-1">Stock returns</p>
        </div>
      </div>
    </div>
  );
}
