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
} from 'lucide-react';

export default function ShopsList({ onSelectShop, onAddNewShop, onGoHome }) {
  const { currentUser } = useAuth();
  const { getFormattedDate, getTodayMarket, getAuthorizedShops, connectedMarkets } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCm, setSelectedCm] = useState('ALL');
  const [historyShop, setHistoryShop] = useState(null);

  const todayDate = getFormattedDate();
  const todayMarket = getTodayMarket(currentUser?.id, todayDate);
  const authorizedShops = getAuthorizedShops(currentUser?.id, todayDate);

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

  // Filter shops by Search and Connected Market
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
            Select a Connected Market below or click a shop to start order/visit
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

      {/* 2. CONNECTED MARKETS FILTER CHIPS */}
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
            No authorized shops found for the selected filter "{selectedCm === 'ALL' ? searchQuery : selectedCm}".
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredShops.map((shop) => (
            <div
              key={shop.id}
              onClick={() => onSelectShop && onSelectShop(shop)}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-99 space-y-3"
            >
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
                  <span className={`font-bold ${shop.outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    ₹{(shop.outstanding || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Last Visit</span>
                  <span className="font-semibold text-slate-600">
                    {shop.lastVisitDate || 'Never'}
                  </span>
                </div>
              </div>
            </div>
          ))}
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
