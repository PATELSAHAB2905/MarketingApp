import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/common/StatusBadge';
import { locationTrackingService } from '../../services/locationTrackingService';
import {
  CheckCircle2,
  MapPin,
  Clock,
  Calendar,
  Store,
  Target,
  IndianRupee,
  History,
  ArrowRight,
  X,
  Shield,
  AlertTriangle,
  Layers,
  ChevronRight,
  Check,
} from 'lucide-react';

export default function MorningCheckIn({ onClose }) {
  const { currentUser } = useAuth();
  const {
    getFormattedDate,
    getFormattedTime,
    getTodayMarket,
    getTodayAvailableMarkets,
    getAuthorizedShops,
    addCheckIn,
    targets,
    checkIns = [],
    getShopOutstanding,
    markets = [],
  } = useData();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [gpsStatus, setGpsStatus] = useState({ text: 'GPS will be requested upon Start My Day', ok: true });

  const dateStr = getFormattedDate();
  const timeStr = getFormattedTime();

  // Get all available route markets for today for this marketer
  const availableMarkets = getTodayAvailableMarkets
    ? getTodayAvailableMarkets(currentUser?.id, dateStr)
    : [];

  const todayMarketInfo = getTodayMarket(currentUser?.id, dateStr);

  // Default selected market: first market in route or active market if already set
  const [selectedMarketId, setSelectedMarketId] = useState(
    todayMarketInfo?.marketId || availableMarkets[0]?.id || (markets[0]?.id || '')
  );

  useEffect(() => {
    if (!selectedMarketId && availableMarkets.length > 0) {
      setSelectedMarketId(availableMarkets[0].id);
    }
  }, [availableMarkets, selectedMarketId]);

  const selectedMarket = availableMarkets.find((m) => m.id === selectedMarketId) ||
    markets.find((m) => m.id === selectedMarketId) ||
    availableMarkets[0] ||
    null;

  const todayCheckIn = checkIns.find(
    (c) => c.marketerId === currentUser?.id && (c.date === dateStr || c.createdDate === dateStr)
  );

  const sessionCount = todayCheckIn?.sessions?.length || 0;
  const isRestart = sessionCount > 0 && Boolean(todayCheckIn?.isDayEnded || todayCheckIn?.endTime);
  const currentSessionNum = isRestart ? sessionCount + 1 : (sessionCount > 0 ? sessionCount : 1);

  const marketerTarget = targets.find((t) => t.marketerId === currentUser?.id) || {
    dailyKg: 130,
    dailyCollection: 25000,
    dailyVisits: 30,
    dailyNewCustomers: 3,
  };

  const handleStartDay = async () => {
    if (!selectedMarket) {
      alert('Please select a market from your route to start your day.');
      return;
    }

    setLoading(true);
    setGpsStatus({ text: 'Acquiring device GPS location...', ok: true });

    const chosenMarketId = selectedMarket.id;
    const chosenMarketName = selectedMarket.name;

    try {
      // Start live tracking service (requests real GPS & syncs to Firestore)
      const trackResult = await locationTrackingService.startTracking({
        marketerId: currentUser?.id,
        marketerName: currentUser?.name,
        marketId: chosenMarketId,
        marketName: chosenMarketName,
        sessionId: currentSessionNum,
        initialStatus: 'On Market Visit',
      });

      const hasGps = trackResult.latitude != null && trackResult.longitude != null;

      addCheckIn({
        marketerId: currentUser?.id,
        marketerName: currentUser?.name,
        activeMarketId: chosenMarketId,
        activeMarketName: chosenMarketName,
        marketId: chosenMarketId,
        marketName: chosenMarketName,
        routeMarkets: availableMarkets.map((m) => ({ id: m.id, name: m.name, order: m.order })),
        routeType: availableMarkets.length > 1 ? `Multi-Market Route (${availableMarkets.length} Markets)` : 'Fixed Route',
        gpsLocation: hasGps
          ? {
              lat: trackResult.latitude,
              lng: trackResult.longitude,
              accuracy: trackResult.accuracy,
              verified: true,
            }
          : { verified: false, permission: trackResult.locationPermission },
        targetKg: marketerTarget.dailyKg,
        targetCollection: marketerTarget.dailyCollection,
      });

      if (hasGps) {
        setGpsStatus({ text: `GPS Verified (±${trackResult.accuracy}m)`, ok: true });
      } else {
        setGpsStatus({ text: 'Location unavailable or denied (Day started)', ok: false });
      }

      setLoading(false);
      setSuccess(true);
    } catch (e) {
      console.error('[MorningCheckIn Error]', e);
      addCheckIn({
        marketerId: currentUser?.id,
        marketerName: currentUser?.name,
        activeMarketId: chosenMarketId,
        activeMarketName: chosenMarketName,
        marketId: chosenMarketId,
        marketName: chosenMarketName,
        routeMarkets: availableMarkets.map((m) => ({ id: m.id, name: m.name, order: m.order })),
        routeType: availableMarkets.length > 1 ? `Multi-Market Route (${availableMarkets.length} Markets)` : 'Fixed Route',
        targetKg: marketerTarget.dailyKg,
        targetCollection: marketerTarget.dailyCollection,
      });
      setLoading(false);
      setSuccess(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 to-amber-900 text-white p-5 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded-md uppercase tracking-wider">
              {todayMarketInfo?.day || 'TODAY'} ROUTE
            </span>
            <p className="text-xs text-amber-200 font-bold uppercase tracking-wider">
              {isRestart ? `RESTART DAY • SESSION ${currentSessionNum}` : 'START MY DAY'}
            </p>
          </div>
          <h2 className="text-2xl font-black mt-1">
            Select Today's Active Market
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
              {/* Instructions Prompt */}
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-start gap-3">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl mt-0.5">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                    Choose Your Work Market For Today
                  </h4>
                  <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                    Your route contains <strong>{availableMarkets.length} markets</strong>. Select the market you are marketing today. Your shops and visits will be scoped to this selection.
                  </p>
                </div>
              </div>

              {/* Market Selection Cards */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Available Route Markets ({availableMarkets.length})
                  </span>
                  <span className="text-[11px] text-amber-700 font-bold">
                    Select 1 Market
                  </span>
                </div>

                {availableMarkets.map((mkt, idx) => {
                  const isSelected = selectedMarketId === mkt.id;
                  return (
                    <div
                      key={mkt.id}
                      onClick={() => setSelectedMarketId(mkt.id)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-150 relative ${
                        isSelected
                          ? 'bg-amber-50/80 border-amber-500 shadow-md ring-2 ring-amber-400/30'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                              isSelected
                                ? 'border-amber-600 bg-amber-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black text-slate-900 uppercase">
                                {mkt.name}
                              </h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                Route #{idx + 1}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                              {mkt.district} District • {mkt.distanceKm || 45} KM
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="px-2.5 py-1 bg-amber-500 text-slate-950 text-[10px] font-black rounded-lg uppercase tracking-wide">
                            Selected
                          </span>
                        )}
                      </div>

                      {/* Market Statistics Matrix */}
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                        <div className="bg-white/80 p-2 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Shops</span>
                          <span className="text-sm font-black text-slate-900">{mkt.totalParties} Shops</span>
                        </div>
                        <div className="bg-white/80 p-2 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Due</span>
                          <span className="text-sm font-black text-red-700">₹{(mkt.totalDue || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="bg-white/80 p-2 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Pending Coll.</span>
                          <span className="text-sm font-black text-amber-700">{mkt.pendingCollections} Shops</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Real GPS Notice */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-2.5 text-xs text-slate-700">
                <MapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
                <div>
                  <span className="font-bold block">Live GPS Location Verification:</span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {gpsStatus.text}
                  </span>
                </div>
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

              {/* Start Button */}
              <button
                onClick={handleStartDay}
                disabled={loading || !selectedMarket}
                className="w-full py-4 bg-gradient-to-r from-red-700 via-red-800 to-amber-700 text-white rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
              >
                {loading ? 'STARTING DAY (BECOMING ACTIVE)...' : `START MY DAY IN ${selectedMarket?.name?.toUpperCase() || 'MARKET'} ✓`}
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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-950 font-black text-xs rounded-xl mt-2 border border-amber-300">
                  <MapPin className="w-3.5 h-3.5 text-red-600" />
                  <span>ACTIVE MARKET: {selectedMarket?.name?.toUpperCase()}</span>
                </div>
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
