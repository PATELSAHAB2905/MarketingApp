import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/common/StatusBadge';
import ShopHistoryModal from '../../components/common/ShopHistoryModal';
import {
  Search,
  Store,
  Phone,
  MapPin,
  IndianRupee,
  AlertTriangle,
  ChevronRight,
  Clock,
  PlusCircle,
  Home,
  ArrowLeft,
  FileText,
  Layers,
  Filter,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  RotateCcw,
} from 'lucide-react';

export default function ShopsList({ onSelectShop, onAddNewShop, onGoHome }) {
  const { currentUser } = useAuth();
  const {
    getFormattedDate,
    getTodayMarket,
    getAuthorizedShops,
    connectedMarkets,
    getShopOutstanding,
    visits = [],
    orders = [],
    collections = [],
    returns = [],
    followups = [],
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCm, setSelectedCm] = useState('ALL');
  const [connectFilter, setConnectFilter] = useState('ALL'); // 'ALL' | 'CONNECTED' | 'PENDING'
  const [historyShop, setHistoryShop] = useState(null);

  const todayDate = getFormattedDate();
  const todayMarket = getTodayMarket(currentUser?.id, todayDate);
  const authorizedShops = getAuthorizedShops(currentUser?.id, todayDate);

  // Marketer specific activities for today
  const todayVisits = useMemo(
    () => visits.filter((v) => (v.date === todayDate || v.createdDate === todayDate) && (v.marketerId === currentUser?.id || currentUser?.role === 'ADMIN')),
    [visits, todayDate, currentUser]
  );
  const todayOrders = useMemo(
    () => orders.filter((o) => (o.date === todayDate || o.createdDate === todayDate) && (o.marketerId === currentUser?.id || currentUser?.role === 'ADMIN')),
    [orders, todayDate, currentUser]
  );
  const todayCollections = useMemo(
    () => collections.filter((c) => (c.date === todayDate || c.createdDate === todayDate) && (c.marketerId === currentUser?.id || currentUser?.role === 'ADMIN')),
    [collections, todayDate, currentUser]
  );
  const todayReturns = useMemo(
    () => returns.filter((r) => (r.date === todayDate || r.createdDate === todayDate) && (r.marketerId === currentUser?.id || currentUser?.role === 'ADMIN')),
    [returns, todayDate, currentUser]
  );
  const todayFollowups = useMemo(
    () => followups.filter((f) => (f.date === todayDate || f.createdDate === todayDate) && (f.marketerId === currentUser?.id || currentUser?.role === 'ADMIN')),
    [followups, todayDate, currentUser]
  );

  // Map of shopId / shopName -> interaction summary for today
  const shopInteractionMap = useMemo(() => {
    const map = new Map();

    const addAction = (shopId, shopName, actionLabel, actionType) => {
      const key = (shopId || shopName || '').trim().toLowerCase();
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, { isConnected: true, actions: [] });
      }
      const entry = map.get(key);
      if (!entry.actions.some((a) => a.label === actionLabel)) {
        entry.actions.push({ label: actionLabel, type: actionType });
      }
    };

    todayVisits.forEach((v) => {
      const outcomeText = Array.isArray(v.outcomes) ? v.outcomes.join(', ') : (v.outcomes || 'Visited');
      addAction(v.shopId, v.shopName, `Visit: ${outcomeText}`, 'visit');
    });

    todayOrders.forEach((o) => {
      addAction(o.shopId, o.shopName, `Order: ${o.totalKg || 0} KG (₹${Number(o.grandTotal || o.totalValue || 0).toLocaleString('en-IN')})`, 'order');
    });

    todayCollections.forEach((c) => {
      addAction(c.shopId, c.shopName, `Coll: ₹${Number(c.amount || 0).toLocaleString('en-IN')} (${c.paymentMode || 'Cash'})`, 'collection');
    });

    todayReturns.forEach((r) => {
      addAction(r.shopId, r.shopName, `Return: ₹${Number(r.returnValue || 0).toLocaleString('en-IN')}`, 'return');
    });

    todayFollowups.forEach((f) => {
      addAction(f.shopId, f.shopName, `Follow-up: ${f.reason || 'General'}`, 'followup');
    });

    return map;
  }, [todayVisits, todayOrders, todayCollections, todayReturns, todayFollowups]);

  // Counts
  const connectedCount = useMemo(() => {
    return authorizedShops.filter((s) => {
      const kId = (s.id || '').trim().toLowerCase();
      const kName = (s.name || '').trim().toLowerCase();
      return (kId && shopInteractionMap.has(kId)) || (kName && shopInteractionMap.has(kName));
    }).length;
  }, [authorizedShops, shopInteractionMap]);

  const pendingCount = Math.max(0, authorizedShops.length - connectedCount);

  // Get all connected markets associated with the authorized shops / current route
  const availableCms = useMemo(() => {
    const map = new Map();
    authorizedShops.forEach((s) => {
      const cmName = s.connectedMarketName || s.marketName || (s.address ? s.address.split(',')[0] : 'Main Market');
      const cmKey = (s.connectedMarketId || cmName || 'general').toLowerCase().trim();
      if (!map.has(cmKey)) {
        map.set(cmKey, {
          key: cmKey,
          id: s.connectedMarketId,
          name: cmName,
          count: 0,
        });
      }
      map.get(cmKey).count += 1;
    });
    return Array.from(map.values());
  }, [authorizedShops]);

  // Filter shops by Search, Connected Market, and Connect Status
  const filteredShops = authorizedShops.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(q) ||
      (s.owner && s.owner.toLowerCase().includes(q)) ||
      (s.mobile && s.mobile.includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q));

    if (!matchSearch) return false;

    if (selectedCm !== 'ALL') {
      const cmName = s.connectedMarketName || s.marketName || (s.address ? s.address.split(',')[0] : 'Main Market');
      const cmKey = (s.connectedMarketId || cmName || 'general').toLowerCase().trim();
      if (cmKey !== selectedCm && s.connectedMarketId !== selectedCm) return false;
    }

    const kId = (s.id || '').trim().toLowerCase();
    const kName = (s.name || '').trim().toLowerCase();
    const isConn = (kId && shopInteractionMap.has(kId)) || (kName && shopInteractionMap.has(kName));

    if (connectFilter === 'CONNECTED' && !isConn) return false;
    if (connectFilter === 'PENDING' && isConn) return false;

    return true;
  });

  return (
    <div className="space-y-4">
      {/* 1. Clear Header Bar with ← HOME / DASHBOARD Button */}
      <div className="bg-gradient-to-r from-red-900 via-red-800 to-amber-900 text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
        <button
          type="button"
          onClick={onGoHome}
          className="py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-red-950 font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          <Home className="w-4 h-4" />
          <span>← DASHBOARD</span>
        </button>
        <div className="text-right">
          <span className="text-[10px] font-extrabold text-amber-300 uppercase tracking-widest block">
            MARKET ROUTE
          </span>
          <span className="text-sm font-black text-white uppercase">
            {todayMarket?.marketName || 'PACHORE'}
          </span>
        </div>
      </div>

      {/* Title & Action Row */}
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase flex items-center gap-1.5">
            <Store className="w-5 h-5 text-red-700" />
            <span>{todayMarket?.marketName || 'PACHORE'} SHOPS ({filteredShops.length})</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Auto-connects when you take order, collection, return or follow-up
          </p>
        </div>
        {onAddNewShop && (
          <button
            onClick={onAddNewShop}
            className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            New Shop
          </button>
        )}
      </div>

      {/* 2. AUTO-CONNECT STATUS FILTER PILLS */}
      <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-black">
        <button
          onClick={() => setConnectFilter('ALL')}
          className={`py-2 px-2 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 ${
            connectFilter === 'ALL'
              ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-slate-500">All Shops</span>
          <span className="text-sm font-black">{authorizedShops.length}</span>
        </button>

        <button
          onClick={() => setConnectFilter('CONNECTED')}
          className={`py-2 px-2 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 ${
            connectFilter === 'CONNECTED'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-700 hover:text-emerald-800 bg-emerald-50/50'
          }`}
        >
          <span className="text-[10px] uppercase font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Connected</span>
          </span>
          <span className="text-sm font-black">{connectedCount}</span>
        </button>

        <button
          onClick={() => setConnectFilter('PENDING')}
          className={`py-2 px-2 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 ${
            connectFilter === 'PENDING'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-amber-800 hover:text-amber-900 bg-amber-50/50'
          }`}
        >
          <span className="text-[10px] uppercase font-bold flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
          <span className="text-sm font-black">{pendingCount}</span>
        </button>
      </div>

      {/* 3. CONNECTED MARKETS FILTER CHIPS */}
      {availableCms.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase">
            <Layers className="w-3.5 h-3.5 text-amber-700" />
            <span>Connected Markets in this Route:</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCm('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCm === 'ALL'
                  ? 'bg-slate-900 text-amber-300 shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>ALL SHOPS</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedCm === 'ALL' ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'
              }`}>
                {authorizedShops.length}
              </span>
            </button>

            {availableCms.map((cm) => {
              const isSelected = selectedCm === cm.key || selectedCm === cm.id;
              return (
                <button
                  key={cm.key}
                  onClick={() => setSelectedCm(isSelected ? 'ALL' : cm.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-red-700 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <MapPin className={`w-3 h-3 ${isSelected ? 'text-amber-300' : 'text-red-600'}`} />
                  <span>{cm.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected ? 'bg-white text-red-900' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {cm.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Large Search Box */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Shop Name, Mobile or Market..."
          className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-red-600 focus:border-red-600 shadow-xs"
        />
      </div>

      {/* Shops List */}
      {filteredShops.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
          <Store className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No Shops Found</p>
          <p className="text-xs text-slate-400">
            No authorized shops found for the selected filter "{connectFilter !== 'ALL' ? connectFilter : selectedCm}".
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredShops.map((shop) => {
            const kId = (shop.id || '').trim().toLowerCase();
            const kName = (shop.name || '').trim().toLowerCase();
            const connectInfo = (kId && shopInteractionMap.get(kId)) || (kName && shopInteractionMap.get(kName)) || null;
            const isConnectedToday = Boolean(connectInfo);

            return (
              <div
                key={shop.id}
                onClick={() => onSelectShop && onSelectShop(shop)}
                className={`bg-white p-4 rounded-2xl border shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-99 space-y-3 ${
                  isConnectedToday ? 'border-emerald-300 ring-1 ring-emerald-200/60' : 'border-slate-200'
                }`}
              >
                {/* AUTO-CONNECT STATUS STRIP */}
                {isConnectedToday ? (
                  <div className="bg-emerald-50 border border-emerald-200/90 text-emerald-950 px-3 py-1.5 rounded-xl text-xs flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-1.5 font-black text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>CONNECTED TODAY</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {connectInfo.actions.map((act, i) => (
                        <span
                          key={i}
                          className="bg-white border border-emerald-300 text-emerald-900 px-2 py-0.5 rounded-md text-[10px] font-bold"
                        >
                          {act.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                      <span>Pending Visit / Action</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">Tap to interact →</span>
                  </div>
                )}

                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 text-base">{shop.name}</h3>
                      <StatusBadge status={shop.status || 'Customer'} type="shop" />
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Owner: <strong>{shop.owner || '—'}</strong> • {shop.mobile || '—'}
                    </p>
                    {(shop.connectedMarketName || shop.address) && (
                      <p className="text-[11px] text-amber-900 font-semibold flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-red-600 flex-shrink-0" />
                        <span>{shop.connectedMarketName || shop.address}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistoryShop(shop);
                      }}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 rounded-xl text-xs font-black flex items-center gap-1 transition-all border border-amber-200 shadow-2xs"
                      title="View Statement & History"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-700" />
                      <span>📜 Statement</span>
                    </button>
                    <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  </div>
                </div>

                {/* Warnings & Metrics */}
                {shop.highReturnWarning && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>⚠ HIGH RETURN SHOP (Check reason before taking order)</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Last Order</span>
                    <span className="font-bold text-slate-800">
                      {shop.lastOrderKg ? `${shop.lastOrderKg} KG` : 'No Orders'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Outstanding</span>
                    {(() => {
                      const shopDue = getShopOutstanding ? getShopOutstanding(shop) : (shop.outstanding || 0);
                      return (
                        <span className={`font-bold ${shopDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          ₹{shopDue.toLocaleString('en-IN')}
                        </span>
                      );
                    })()}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Last Visit</span>
                    <span className={`font-semibold ${isConnectedToday ? 'text-emerald-700 font-bold' : 'text-slate-600'}`}>
                      {isConnectedToday ? 'Today' : (shop.lastVisitDate || 'Never')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shop History Modal */}
      {historyShop && (
        <ShopHistoryModal
          shop={historyShop}
          onClose={() => setHistoryShop(null)}
        />
      )}
    </div>
  );
}
