import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Award, CheckCircle2, X, TrendingUp, IndianRupee, ShieldCheck, AlertCircle, Clock } from 'lucide-react';

export default function EndOfDayCheckout({ onClose }) {
  const { currentUser } = useAuth();
  const {
    getFormattedDate,
    getFormattedTime,
    getTodayMarket,
    getAuthorizedShops,
    targets,
    visits,
    orders,
    collections,
    returns,
    followups,
    addHandover,
    checkIns = [],
    endMarketerDay,
  } = useData();

  const todayDate = getFormattedDate();
  const todayMarket = getTodayMarket(currentUser?.id, todayDate);
  const authorizedShops = getAuthorizedShops(currentUser?.id, todayDate);

  const todayCheckIn = checkIns.find(
    (c) => c.marketerId === currentUser?.id && (c.date === todayDate || c.createdDate === todayDate)
  );

  const isAlreadyEnded = Boolean(todayCheckIn?.endTime || todayCheckIn?.isDayEnded);
  const hasNotStarted = !todayCheckIn;

  const todayVisits = visits.filter(v => v.marketerId === currentUser?.id && (v.date === todayDate || v.createdDate === todayDate));
  const todayOrders = orders.filter(o => o.marketerId === currentUser?.id && (o.date === todayDate || o.createdDate === todayDate));
  const todayCollections = collections.filter(c => c.marketerId === currentUser?.id && (c.date === todayDate || c.createdDate === todayDate));
  const todayReturns = returns.filter(r => r.marketerId === currentUser?.id && (r.date === todayDate || r.createdDate === todayDate));
  const todayFollowups = followups.filter(f => f.marketerId === currentUser?.id && (f.date === todayDate || f.createdDate === todayDate));

  const totalOrderKg = todayOrders.reduce((sum, o) => sum + (o.totalKg || 0), 0);
  const totalOrderValue = todayOrders.reduce((sum, o) => sum + (o.grandTotal || o.totalValue || 0), 0);
  const totalCollectionValue = todayCollections.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalReturnValue = todayReturns.reduce((sum, r) => sum + (r.returnValue || 0), 0);

  // Breakdown by payment mode
  const recordedCash = todayCollections.filter(c => c.paymentMode === 'Cash').reduce((s, c) => s + c.amount, 0);
  const recordedUpi = todayCollections.filter(c => c.paymentMode === 'UPI').reduce((s, c) => s + c.amount, 0);
  const recordedCheque = todayCollections.filter(c => c.paymentMode === 'Cheque' || c.paymentMode === 'Bank Transfer').reduce((s, c) => s + c.amount, 0);

  const [handedCash, setHandedCash] = useState(recordedCash);
  const [handedUpi, setHandedUpi] = useState(recordedUpi);
  const [handedCheque, setHandedCheque] = useState(recordedCheque);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [savedEndTime, setSavedEndTime] = useState('');

  const marketerTarget = targets.find(t => t.marketerId === currentUser?.id) || {
    dailyKg: 130,
    dailyCollection: 25000,
    dailyVisits: 30,
  };

  const totalHandedOver = Number(handedCash) + Number(handedUpi) + Number(handedCheque);
  const difference = totalCollectionValue - totalHandedOver;

  const handleConfirmEndMarket = () => {
    if (hasNotStarted) return;
    setSubmitting(true);

    const endTimeStr = getFormattedTime();
    setSavedEndTime(endTimeStr);

    setTimeout(() => {
      // 1. Update existing check-in to INACTIVE with exact End Time
      endMarketerDay({
        marketerId: currentUser?.id,
        date: todayDate,
        endTime: endTimeStr,
        remark,
      });

      // 2. Add Handover record
      addHandover({
        marketerId: currentUser?.id,
        marketerName: currentUser?.name,
        marketId: todayMarket?.marketId || 'mkt-pachore',
        marketName: todayMarket?.marketName || 'Pachore',
        date: todayDate,
        time: endTimeStr,
        startTime: todayCheckIn?.startTime || todayCheckIn?.createdTime || 'Morning',
        endTime: endTimeStr,
        recordedCash,
        recordedUpi,
        recordedCheque,
        totalRecorded: totalCollectionValue,
        handedCash: Number(handedCash),
        handedUpi: Number(handedUpi),
        handedCheque: Number(handedCheque),
        totalHandedOver,
        difference,
        remark,
        totalOrderKg,
        totalOrderValue,
        totalReturns: totalReturnValue,
        visitsCount: todayVisits.length,
      });

      setSubmitting(false);
      setCompleted(true);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        <div className="bg-gradient-to-r from-red-900 via-red-800 to-amber-900 text-white p-5 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-xs text-amber-300 font-bold uppercase tracking-wider">DAILY CHECKOUT</p>
          <h2 className="text-2xl font-black mt-0.5">END MY DAY</h2>
          <p className="text-xs text-red-200 font-medium">Patel Sahab Spices • {todayDate}</p>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800">
          {hasNotStarted ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Please Start My Day First</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                You have not started your business day yet today. Please click <strong>START MY DAY</strong> on your dashboard before checking out.
              </p>
              <button
                onClick={onClose}
                className="mt-2 py-3 px-6 bg-slate-900 text-white font-bold rounded-xl text-xs"
              >
                BACK TO DASHBOARD
              </button>
            </div>
          ) : isAlreadyEnded && !completed ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Day Already Ended (⚪ INACTIVE)</h3>
              <p className="text-xs text-slate-600">
                You already completed <strong>END MY DAY</strong> for today at <strong>{todayCheckIn.endTime}</strong>.
              </p>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-left space-y-1 mt-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Start Time:</span>
                  <span className="font-bold text-slate-800">{todayCheckIn.startTime || todayCheckIn.createdTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">End Time:</span>
                  <span className="font-bold text-red-700">{todayCheckIn.endTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-black text-slate-600">⚪ INACTIVE</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="mt-2 py-3 px-6 bg-slate-900 text-white font-bold rounded-xl text-xs w-full"
              >
                CLOSE
              </button>
            </div>
          ) : !completed ? (
            <>
              {/* Timing Banner */}
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex justify-between items-center text-xs">
                <div>
                  <span className="text-amber-800 font-bold uppercase text-[10px]">Start Time:</span>
                  <p className="font-black text-amber-950">{todayCheckIn?.startTime || todayCheckIn?.createdTime || 'Morning'}</p>
                </div>
                <div className="text-right">
                  <span className="text-amber-800 font-bold uppercase text-[10px]">Current End Time:</span>
                  <p className="font-black text-red-700">{getFormattedTime()}</p>
                </div>
              </div>

              {/* Plan vs Actual Progress Indicators */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-3 shadow-md">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <TrendingUp className="w-4 h-4" />
                  TODAY'S FIELD TOTALS
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-800 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[10px] uppercase">Orders Taken:</span>
                    <span className="font-black text-amber-300 text-sm">{totalOrderKg} KG</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">₹{totalOrderValue.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-slate-800 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[10px] uppercase">Total Collection:</span>
                    <span className="font-black text-emerald-400 text-sm">₹{totalCollectionValue.toLocaleString('en-IN')}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{todayCollections.length} receipts</p>
                  </div>
                </div>
              </div>

              {/* Evening Cash & Collection Handover */}
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
                  <h4 className="text-xs font-black text-emerald-950 uppercase flex items-center gap-1.5">
                    <IndianRupee className="w-4 h-4 text-emerald-700" />
                    COLLECTION HANDOVER
                  </h4>
                  <span className="text-xs font-black text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md">
                    Total: ₹{totalCollectionValue.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                      Cash (₹)
                    </label>
                    <input
                      type="number"
                      value={handedCash}
                      onChange={(e) => setHandedCash(e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-xl p-2 text-xs font-black"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                      UPI / QR (₹)
                    </label>
                    <input
                      type="number"
                      value={handedUpi}
                      onChange={(e) => setHandedUpi(e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-xl p-2 text-xs font-black"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                      Cheque (₹)
                    </label>
                    <input
                      type="number"
                      value={handedCheque}
                      onChange={(e) => setHandedCheque(e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-xl p-2 text-xs font-black"
                    />
                  </div>
                </div>

                {difference !== 0 && (
                  <div className="bg-amber-100 border border-amber-300 text-amber-900 p-2.5 rounded-xl text-xs font-bold">
                    ⚠️ Handover Difference: ₹{difference} (Recorded ₹{totalCollectionValue} vs Handed ₹{totalHandedOver})
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">EOD Remark / Handover Note</label>
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="e.g. Cash handed over to godown manager / office"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
                />
              </div>

              <button
                onClick={handleConfirmEndMarket}
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-red-700 via-red-800 to-amber-700 text-white rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
              >
                {submitting ? 'ENDING DAY & SAVING...' : 'END MY DAY (BECOME INACTIVE) ✓'}
              </button>
            </>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center mx-auto border-2 border-slate-300">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">DAY ENDED (⚪ INACTIVE)</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Start: <strong>{todayCheckIn?.startTime || todayCheckIn?.createdTime}</strong> • End: <strong>{savedEndTime}</strong>
                </p>
                <p className="text-xs font-bold text-emerald-700 mt-1">Status successfully updated on Admin Dashboard!</p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md"
              >
                GO TO DASHBOARD
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
