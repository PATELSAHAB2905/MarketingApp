import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/common/StatusBadge';
import { CheckCircle2, MapPin, Clock, Calendar, Store, Target, IndianRupee, History, ArrowRight, X } from 'lucide-react';

export default function MorningCheckIn({ onClose }) {
  const { currentUser } = useAuth();
  const { getFormattedDate, getFormattedTime, getTodayMarket, getAuthorizedShops, addCheckIn, targets, checkIns = [] } = useData();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const dateStr = getFormattedDate();
  const timeStr = getFormattedTime();
  const todayMarket = getTodayMarket(currentUser?.id, dateStr);
  const authorizedShops = getAuthorizedShops(currentUser?.id, dateStr);

  const todayCheckIn = checkIns.find(
    (c) => c.marketerId === currentUser?.id && (c.date === dateStr || c.createdDate === dateStr)
  );

  const sessionCount = todayCheckIn?.sessions?.length || 0;
  const isRestart = sessionCount > 0 && Boolean(todayCheckIn?.isDayEnded || todayCheckIn?.endTime);
  const currentSessionNum = isRestart ? sessionCount + 1 : (sessionCount > 0 ? sessionCount : 1);

  const marketerTarget = targets.find(t => t.marketerId === currentUser?.id) || {
    dailyKg: 130,
    dailyCollection: 25000,
    dailyVisits: 30,
    dailyNewCustomers: 3,
  };

  // Mock pending stats for this market
  const pendingCollectionShops = authorizedShops.filter(s => s.outstanding > 0);
  const totalPendingAmount = pendingCollectionShops.reduce((sum, s) => sum + (s.outstanding || 0), 0);

  const handleStartDay = () => {
    setLoading(true);
    setTimeout(() => {
      addCheckIn({
        marketerId: currentUser?.id,
        marketerName: currentUser?.name,
        marketId: todayMarket?.marketId || 'mkt-pachore',
        marketName: todayMarket?.marketName || 'Pachore',
        routeType: todayMarket?.routeType || 'Normal Fixed Route',
        gpsLocation: { lat: 23.7021, lng: 76.7112, address: 'Patel Sahab Office / Godown, Pachore' },
        targetKg: marketerTarget.dailyKg,
        targetCollection: marketerTarget.dailyCollection,
      });
      setLoading(false);
      setSuccess(true);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 to-amber-900 text-white p-5 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-xs text-amber-300 font-bold uppercase tracking-wider">
            {isRestart ? `RESTART DAY • SESSION ${currentSessionNum}` : 'DAILY ATTENDANCE & STATUS'}
          </p>
          <h2 className="text-2xl font-black mt-0.5">
            {isRestart ? `START SESSION ${currentSessionNum}` : 'START MY DAY'}
          </h2>
          <div className="flex items-center gap-2 mt-2 text-xs text-red-200">
            <Calendar className="w-3.5 h-3.5 text-amber-300" />
            <span>{dateStr}</span>
            <Clock className="w-3.5 h-3.5 text-amber-300 ml-2" />
            <span>{timeStr}</span>
          </div>
        </div>

        {/* Content Scroll */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800">
          {!success ? (
            <>
              {/* Market Badge Card */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-xs text-amber-800 font-bold uppercase tracking-wide">Authorized Market</p>
                  <h3 className="text-2xl font-black text-amber-950 uppercase">{todayMarket?.marketName || 'PACHORE'}</h3>
                  <p className="text-xs text-amber-700 font-medium">{authorizedShops.length} Assigned Shops</p>
                </div>
                <StatusBadge status={todayMarket?.routeType || 'Normal Fixed Route'} type="route" />
              </div>

              {/* Auto GPS Detection */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-2.5 text-xs text-slate-600">
                <MapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>GPS Location Auto Detected: <strong>Patel Sahab Office / Godown (Pachore)</strong></span>
              </div>

              {/* Today's Target Summary */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-red-700" />
                  TODAY'S TARGET
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block">Sales Order Target</span>
                    <span className="text-base font-black text-slate-900">{marketerTarget.dailyKg} KG</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block">Collection Target</span>
                    <span className="text-base font-black text-emerald-700">₹{marketerTarget.dailyCollection.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Pending Collections & Follow-ups */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-red-50 border border-red-100 p-3 rounded-2xl">
                  <p className="text-[11px] font-bold text-red-800 uppercase">Pending Collection</p>
                  <p className="text-lg font-black text-red-700 mt-0.5">{pendingCollectionShops.length} Shops</p>
                  <p className="text-[11px] text-red-600 font-semibold">₹{totalPendingAmount.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-2xl">
                  <p className="text-[11px] font-bold text-amber-800 uppercase">Previous Visit Performance</p>
                  <p className="text-lg font-black text-amber-900 mt-0.5">185 KG</p>
                  <p className="text-[11px] text-amber-700 font-semibold">₹42,000 Sales</p>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartDay}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-red-700 via-red-800 to-amber-700 text-white rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
              >
                {loading ? 'STARTING DAY (BECOMING ACTIVE)...' : 'START MY DAY ✓'}
              </button>
            </>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800">MY DAY STARTED (ACTIVE) 🟢</h3>
                <p className="text-sm text-slate-600 mt-1">Start Time recorded at {timeStr}</p>
                <p className="text-xs font-semibold text-amber-700 mt-0.5">Market: {todayMarket?.marketName || 'PACHORE'}</p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2"
              >
                <span>GO TO DASHBOARD</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
