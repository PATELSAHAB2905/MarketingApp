import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/common/StatusBadge';
import {
  ShoppingBag,
  IndianRupee,
  RotateCcw,
  Users,
  Store,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Award,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Calendar,
  Filter,
} from 'lucide-react';

export default function AdminDashboard({ onNavigate }) {
  const { currentUser } = useAuth();
  const {
    getFormattedDate,
    markets,
    marketers,
    shops,
    orders,
    collections,
    returns,
    visits,
    checkIns = [],
  } = useData();

  const todayDate = getFormattedDate();
  // Extract month-year code, e.g. "08-2026"
  const currentMonthCode = todayDate.substring(3); // "-08-2026"
  const currentMonthName = 'August 2026';

  const [timeframe, setTimeframe] = useState('TODAY'); // 'TODAY' | 'MONTH' | 'ALL'

  // Filter datasets based on selected timeframe
  const isMatch = (item) => {
    const d = item.date || item.createdDate || '';
    if (timeframe === 'TODAY') return d === todayDate;
    if (timeframe === 'MONTH') return d.endsWith(currentMonthCode);
    return true; // 'ALL'
  };

  const filteredOrders = orders.filter(isMatch);
  const filteredCollections = collections.filter(isMatch);
  const filteredReturns = returns.filter(isMatch);
  const filteredVisits = visits.filter(isMatch);

  // Dynamic Calculated KPI Totals
  const totalSalesKg = filteredOrders.reduce((sum, o) => sum + (o.totalKg || 0), 0);
  const totalOrderValue = filteredOrders.reduce((sum, o) => sum + (o.grandTotal || o.totalValue || 0), 0);
  const totalCollectionVal = filteredCollections.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalReturnsVal = filteredReturns.reduce((sum, r) => sum + (r.returnValue || 0), 0);
  const totalOrdersCount = filteredOrders.length;
  const totalVisitsCount = filteredVisits.length;

  // Active Marketers Rule: Marketer is ACTIVE strictly if they clicked START MY DAY today AND have NOT clicked END MY DAY
  const activeMarketersToday = marketers.filter((m) => {
    const chk = checkIns.find(
      (c) => c.marketerId === m.id && (c.date === todayDate || c.createdDate === todayDate)
    );
    return chk && chk.status === 'ACTIVE' && !chk.endTime && !chk.isDayEnded;
  });
  const activeMarketersCount = activeMarketersToday.length;
  const distinctMarketsCount = new Set([
    ...filteredOrders.map((o) => o.marketId || o.marketName),
    ...filteredVisits.map((v) => v.marketId),
  ].filter(Boolean)).size || markets.length;

  const newCustomersCount = filteredVisits.filter((v) => v.isNewShop).length || 
    shops.filter((s) => s.status === 'Customer' && s.createdDate === todayDate).length;

  // Recovery Rate calculation
  const recoveryRate = totalOrderValue > 0
    ? Math.min(100, Math.round((totalCollectionVal / totalOrderValue) * 100))
    : (totalCollectionVal > 0 ? 100 : 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-red-900 via-red-800 to-amber-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="space-y-1 z-10">
          <p className="text-xs text-amber-300 font-bold uppercase tracking-wider">
            Patel Sahab Spices • Management Control Center
          </p>
          <h1 className="text-3xl font-black tracking-tight">Good Morning, {currentUser?.name || 'Admin'} 👋</h1>
          <p className="text-xs text-red-200">
            Real-time Marketing & Distribution Overview • Today: {todayDate}
          </p>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xs z-10">
          <span className="text-[10px] font-extrabold text-amber-300 uppercase px-2">Period:</span>
          <button
            onClick={() => setTimeframe('TODAY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              timeframe === 'TODAY'
                ? 'bg-amber-400 text-red-950 shadow-md scale-105'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            Today's Live
          </button>
          <button
            onClick={() => setTimeframe('MONTH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              timeframe === 'MONTH'
                ? 'bg-amber-400 text-red-950 shadow-md scale-105'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            Present Month ({currentMonthName})
          </button>
          <button
            onClick={() => setTimeframe('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              timeframe === 'ALL'
                ? 'bg-amber-400 text-red-950 shadow-md scale-105'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Quick Action: Old Data Import Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 text-slate-950 p-4 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black shadow-xs">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-950 uppercase">
              OLD PARTY DATA IMPORT (MARKET-LINKED)
            </h3>
            <p className="text-xs text-slate-900 font-semibold">
              Upload customer Excel sheets with Receivable & Payable balances linked to Markets & Marketers
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate && onNavigate('old-data-import')}
          className="py-2 px-4 bg-slate-950 hover:bg-slate-900 text-amber-300 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all whitespace-nowrap"
        >
          <span>Import Old Parties →</span>
        </button>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Sales KG */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              {timeframe === 'TODAY' ? "Today's Sales KG" : timeframe === 'MONTH' ? 'Month Sales KG' : 'All-Time Sales KG'}
            </span>
            <div className="p-2 bg-red-50 text-red-700 rounded-2xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{totalSalesKg} KG</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Value: <strong className="text-slate-800">₹{totalOrderValue.toLocaleString('en-IN')}</strong>
            </p>
          </div>
        </div>

        {/* Metric 2: Collection */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              {timeframe === 'TODAY' ? "Today's Collection" : timeframe === 'MONTH' ? 'Month Collection' : 'All-Time Collection'}
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-2xl">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-emerald-700 tracking-tight">₹{totalCollectionVal.toLocaleString('en-IN')}</h2>
            <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{recoveryRate}% recovery vs orders</span>
            </p>
          </div>
        </div>

        {/* Metric 3: Returns */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              {timeframe === 'TODAY' ? "Today's Returns" : timeframe === 'MONTH' ? 'Month Returns' : 'All-Time Returns'}
            </span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-2xl">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-amber-900 tracking-tight">₹{totalReturnsVal.toLocaleString('en-IN')}</h2>
            <p className="text-xs text-amber-700 font-medium mt-1">
              {filteredReturns.length} Return Incident{filteredReturns.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Metric 4: Orders Count */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              {timeframe === 'TODAY' ? "Today's Orders" : timeframe === 'MONTH' ? 'Month Orders' : 'All-Time Orders'}
            </span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-2xl">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{totalOrdersCount} Orders</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              From {totalVisitsCount} Shop Visits (0 Synced to Sheets)
            </p>
          </div>
        </div>
      </div>

      {/* Second Row Operational Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => onNavigate && onNavigate('marketers')}
          className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between border border-slate-800 cursor-pointer hover:border-amber-400 transition-all"
        >
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase">ACTIVE MARKETERS (TODAY)</p>
            <p className="text-2xl font-black mt-0.5 text-amber-300">
              {activeMarketersCount} / {marketers.length} Active
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {activeMarketersCount > 0 ? `🟢 ${activeMarketersCount} In Field` : '⚪ All Inactive / Ended Day'}
            </p>
          </div>
          <Users className="w-6 h-6 text-amber-400" />
        </div>

        <div
          onClick={() => onNavigate && onNavigate('markets')}
          className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between border border-slate-800 cursor-pointer hover:border-red-400 transition-all"
        >
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase">Markets Covered</p>
            <p className="text-2xl font-black mt-0.5 text-white">{distinctMarketsCount} Covered</p>
          </div>
          <MapPin className="w-6 h-6 text-red-400" />
        </div>

        <div
          onClick={() => onNavigate && onNavigate('shops')}
          className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between border border-slate-800 cursor-pointer hover:border-emerald-400 transition-all"
        >
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase">Shops Visited</p>
            <p className="text-2xl font-black mt-0.5 text-emerald-400">{totalVisitsCount} Visited</p>
          </div>
          <Store className="w-6 h-6 text-emerald-400" />
        </div>

        <div
          onClick={() => onNavigate && onNavigate('shops')}
          className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between border border-slate-800 cursor-pointer hover:border-purple-400 transition-all"
        >
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase">New Customers</p>
            <p className="text-2xl font-black mt-0.5 text-purple-300">{newCustomersCount} Onboarded</p>
          </div>
          <Award className="w-6 h-6 text-purple-400" />
        </div>
      </div>

      {/* TODAY'S MARKETER ATTENDANCE & STATUS TABLE (START & END TIME) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
              <Users className="w-5 h-5 text-red-700" />
              <span>MARKETER ATTENDANCE & LIVE STATUS (TODAY • {todayDate})</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">Real-time status based on Start My Day and End My Day</p>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('marketers')}
            className="text-xs font-bold text-red-700 hover:underline flex items-center gap-1"
          >
            Marketers Master <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] text-slate-400 uppercase font-bold">
                <th className="pb-3 px-3">Marketer</th>
                <th className="pb-3 px-3">Current Status</th>
                <th className="pb-3 px-3">Today's Sessions History</th>
                <th className="pb-3 px-3">Latest Start</th>
                <th className="pb-3 px-3">Latest End</th>
                <th className="pb-3 px-3 text-right">Today Orders</th>
                <th className="pb-3 px-3 text-right">Today Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {marketers.map((m) => {
                const chk = checkIns.find(
                  (c) => c.marketerId === m.id && (c.date === todayDate || c.createdDate === todayDate)
                );
                const isActive = Boolean(chk && chk.status === 'ACTIVE' && !chk.endTime && !chk.isDayEnded);
                const isEnded = Boolean(chk && (chk.status === 'INACTIVE' || chk.endTime || chk.isDayEnded));
                const startTimeStr = chk?.startTime || chk?.createdTime || '—';
                const endTimeStr = chk?.endTime || chk?.endedTime || '—';

                const mOrders = orders.filter((o) => o.marketerId === m.id && (o.date === todayDate || o.createdDate === todayDate));
                const mKg = mOrders.reduce((s, o) => s + (o.totalKg || 0), 0);
                const mVal = mOrders.reduce((s, o) => s + (o.grandTotal || o.totalValue || 0), 0);

                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-3 font-extrabold text-slate-900 text-sm">
                      {m.name}
                      <p className="text-[11px] text-slate-400 font-normal">{m.mobile}</p>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                            : 'bg-slate-100 text-slate-500 border-slate-300'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span>{isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      {chk?.sessions && chk.sessions.length > 0 ? (
                        <div className="space-y-1">
                          {chk.sessions.map((sess, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-1 text-[11px]">
                              <span className="font-extrabold text-slate-600">S{sess.sessionNumber || sIdx + 1}:</span>
                              <span className="text-slate-800 font-bold">{sess.startTime}</span>
                              <span className="text-slate-400">→</span>
                              {sess.endTime ? (
                                <span className="font-bold text-slate-700">{sess.endTime}</span>
                              ) : (
                                <span className="text-emerald-700 font-black bg-emerald-100 px-1.5 py-0.2 rounded-md">Active 🟢</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-800 text-xs">
                      {startTimeStr}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-800 text-xs">
                      {isEnded ? <span className="text-red-700 font-extrabold">{endTimeStr}</span> : endTimeStr}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-slate-800">
                      {mOrders.length} ({mKg} KG)
                    </td>
                    <td className="py-3.5 px-3 text-right font-black text-emerald-700">
                      ₹{mVal.toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Grid: Real Marketer Performance Ranking & Market Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real Dynamic Marketer Performance Ranking */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase">
                MARKETER PERFORMANCE RANKING ({timeframe === 'TODAY' ? 'TODAY' : timeframe === 'MONTH' ? currentMonthName : 'ALL TIME'})
              </h3>
              <p className="text-xs text-slate-500">Live sales KG, collections & orders count</p>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('marketers')}
              className="text-xs font-bold text-red-700 hover:underline flex items-center gap-1"
            >
              Manage <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {marketers.map((m, idx) => {
              const mOrders = filteredOrders.filter((o) => o.marketerId === m.id);
              const mKg = mOrders.reduce((s, o) => s + (o.totalKg || 0), 0);
              const mCollections = filteredCollections.filter((c) => c.marketerId === m.id);
              const mColl = mCollections.reduce((s, c) => s + (c.amount || 0), 0);

              return (
                <div
                  key={m.id}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-300 font-black text-sm flex items-center justify-center">
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{m.name}</h4>
                      <p className="text-xs text-slate-500">{m.mobile} • {mOrders.length} Orders</p>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <p className="font-black text-slate-900 text-sm">{mKg} KG</p>
                    <p className="text-emerald-700 font-bold">₹{mColl.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Recent Orders Stream */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase">RECENT FIELD ORDERS</h3>
              <p className="text-xs text-slate-500">Live stream of latest orders with price breakdown</p>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('orders')}
              className="text-xs font-bold text-red-700 hover:underline flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5">
            {filteredOrders.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold py-8 text-center">
                No orders recorded for this period yet.
              </p>
            ) : (
              filteredOrders.slice(0, 5).map((o) => (
                <div
                  key={o.id}
                  onClick={() => onNavigate && onNavigate('orders')}
                  className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex justify-between items-center hover:bg-amber-50/50 hover:border-amber-300 cursor-pointer transition-all text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900">{o.id}</span>
                      <span className="font-bold text-slate-800">• {o.shopName}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Marketer: <strong>{o.marketerName}</strong> • {o.totalKg || 0} KG
                      {o.items?.[0] && ` (${o.items[0].productName})`}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-black text-emerald-700 text-sm block">
                      ₹{(o.grandTotal || o.totalValue || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400">{o.time || o.createdTime}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
