import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import PartyStatementDetail from '../../components/common/PartyStatementDetail';
import OrderEntryForm from './OrderEntryForm';
import CollectionForm from './CollectionForm';
import ReturnForm from './ReturnForm';
import {
  FileSpreadsheet,
  Search,
  Store,
  Phone,
  MapPin,
  IndianRupee,
  ChevronRight,
  Filter,
  Plus,
  ShoppingBag,
  RotateCcw,
  FileText,
  Home,
  ArrowLeft,
  Layers,
} from 'lucide-react';

export default function MarketerPartyStatement({ onGoHome }) {
  const { currentUser } = useAuth();
  const { getFormattedDate, getAuthorizedShops, orders, collections, returns } = useData();

  const [selectedShop, setSelectedShop] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCm, setSelectedCm] = useState('ALL');
  const [outstandingFilter, setOutstandingFilter] = useState('ALL'); // 'ALL' | 'WITH_DUES' | 'ZERO'

  // Modals for actions triggered from Party Statement
  const [activeModal, setActiveModal] = useState(null); // 'order' | 'collection' | 'return'
  const [modalShop, setModalShop] = useState(null);

  const todayDate = getFormattedDate();
  // Marketer can only view their authorized / assigned shops
  const authorizedShops = getAuthorizedShops(currentUser?.id, todayDate);

  // Compute live financial totals for marketer's authorized shops
  const enrichedShops = useMemo(() => {
    return authorizedShops.map((s) => {
      const sNorm = (s.name || '').toLowerCase().trim();
      const shopOrders = orders.filter((o) => o.shopId === s.id || (o.shopName && o.shopName.toLowerCase().trim() === sNorm));
      const shopCols = collections.filter((c) => c.shopId === s.id || (c.shopName && c.shopName.toLowerCase().trim() === sNorm));
      const shopRets = returns.filter((r) => r.shopId === s.id || (r.shopName && r.shopName.toLowerCase().trim() === sNorm));

      const totalSales = shopOrders.reduce((sum, o) => sum + (o.grandTotal || o.totalValue || o.subtotal || 0), 0);
      const totalPaid = shopCols.reduce((sum, c) => sum + (c.amount || 0), 0);
      const totalRet = shopRets.reduce((sum, r) => sum + (r.returnValue || r.amount || 0), 0);

      const openingBal = Number(s.openingOutstanding || s.openingBalance || 0);
      const computedOutstanding = Math.max(0, openingBal + totalSales - totalPaid - totalRet);

      const lastOrd = shopOrders.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
      const lastCol = shopCols.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];

      return {
        ...s,
        computedOutstanding: s.outstanding !== undefined && s.outstanding !== null ? Number(s.outstanding) : computedOutstanding,
        totalSales,
        totalPaid,
        totalRet,
        lastTransactionDate: lastOrd?.date || lastCol?.date || s.lastOrderDate || '—',
      };
    });
  }, [authorizedShops, orders, collections, returns]);

  // Connected Markets Filter list
  const availableCms = useMemo(() => {
    const map = new Map();
    enrichedShops.forEach((s) => {
      const cmName = s.connectedMarketName || s.marketName || (s.address ? s.address.split(',')[0] : 'Main Market');
      const cmKey = (s.connectedMarketId || cmName || 'general').toLowerCase().trim();
      if (!map.has(cmKey)) {
        map.set(cmKey, {
          key: cmKey,
          name: cmName,
          count: 0,
        });
      }
      map.get(cmKey).count += 1;
    });
    return Array.from(map.values());
  }, [enrichedShops]);

  // Filtered Shops
  const filteredShops = useMemo(() => {
    return enrichedShops.filter((s) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.name.toLowerCase().includes(q);
        const matchOwner = s.owner && s.owner.toLowerCase().includes(q);
        const matchMobile = s.mobile && s.mobile.includes(q);
        if (!matchName && !matchOwner && !matchMobile) return false;
      }

      if (selectedCm !== 'ALL') {
        const cmName = s.connectedMarketName || s.marketName || (s.address ? s.address.split(',')[0] : 'Main Market');
        const cmKey = (s.connectedMarketId || cmName || 'general').toLowerCase().trim();
        if (cmKey !== selectedCm && s.connectedMarketId !== selectedCm) return false;
      }

      if (outstandingFilter === 'WITH_DUES' && s.computedOutstanding <= 0) return false;
      if (outstandingFilter === 'ZERO' && s.computedOutstanding > 0) return false;

      return true;
    });
  }, [enrichedShops, searchQuery, selectedCm, outstandingFilter]);

  // Action Handlers
  const handleOpenOrder = (shop) => {
    setModalShop(shop);
    setActiveModal('order');
  };

  const handleOpenCollection = (shop) => {
    setModalShop(shop);
    setActiveModal('collection');
  };

  const handleOpenReturn = (shop) => {
    setModalShop(shop);
    setActiveModal('return');
  };

  // If a shop is selected, render the detailed Statement
  if (selectedShop) {
    return (
      <>
        <PartyStatementDetail
          shop={selectedShop}
          onBack={() => setSelectedShop(null)}
          onOpenOrder={handleOpenOrder}
          onOpenCollection={handleOpenCollection}
          onOpenReturn={handleOpenReturn}
        />

        {/* Dynamic Modals Triggered From Statement */}
        {activeModal === 'order' && modalShop && (
          <OrderEntryForm
            shop={modalShop}
            onClose={() => {
              setActiveModal(null);
              setModalShop(null);
            }}
          />
        )}

        {activeModal === 'collection' && modalShop && (
          <CollectionForm
            shop={modalShop}
            onClose={() => {
              setActiveModal(null);
              setModalShop(null);
            }}
            onCollectionSubmitted={() => {
              setActiveModal(null);
              setModalShop(null);
            }}
          />
        )}

        {activeModal === 'return' && modalShop && (
          <ReturnForm
            shop={modalShop}
            onClose={() => {
              setActiveModal(null);
              setModalShop(null);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto p-3 sm:p-5">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-red-900 via-red-800 to-amber-900 text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
        {onGoHome ? (
          <button
            type="button"
            onClick={onGoHome}
            className="py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-red-950 font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>← DASHBOARD</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-300" />
            <span className="font-black text-sm uppercase">MY PARTY STATEMENTS</span>
          </div>
        )}

        <span className="text-xs font-bold text-amber-200 uppercase tracking-wide">
          {currentUser?.name} • LEDGERS
        </span>
      </div>

      {/* Title & Info */}
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase flex items-center gap-1.5">
            <Store className="w-5 h-5 text-red-700" />
            <span>MY PARTIES & LEDGERS ({filteredShops.length})</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Vyapar-style running party statements for your assigned territory
          </p>
        </div>
      </div>

      {/* Connected Market Filters */}
      {availableCms.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCm('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              selectedCm === 'ALL'
                ? 'bg-slate-900 text-amber-300 shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            ALL SHOPS ({enrichedShops.length})
          </button>

          {availableCms.map((cm) => (
            <button
              key={cm.key}
              onClick={() => setSelectedCm(selectedCm === cm.key ? 'ALL' : cm.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCm === cm.key
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              <MapPin className="w-3 h-3 text-red-600" />
              <span>{cm.name}</span>
              <span className="text-[10px] opacity-80">({cm.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Search & Outstanding Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search party by name, owner, mobile..."
            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <select
          value={outstandingFilter}
          onChange={(e) => setOutstandingFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="ALL">All Balances</option>
          <option value="WITH_DUES">Only With Dues (&gt; ₹0)</option>
          <option value="ZERO">Settled / Zero Dues</option>
        </select>
      </div>

      {/* Party Cards Stream */}
      {filteredShops.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
          <Store className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No Parties Found</p>
          <p className="text-xs text-slate-400">No parties match your current search.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredShops.map((shop) => (
            <div
              key={shop.id}
              onClick={() => setSelectedShop(shop)}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-99 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base">{shop.name}</h3>
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

                <div className="text-right">
                  <span
                    className={`font-black text-base block ${
                      shop.computedOutstanding > 0 ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  >
                    ₹{shop.computedOutstanding.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold block">
                    {shop.computedOutstanding > 0 ? 'Outstanding' : 'Settled'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                <span className="text-[11px] text-slate-500 font-medium">
                  Last Activity: <strong>{shop.lastTransactionDate}</strong>
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedShop(shop);
                  }}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1 shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open Statement 📜</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
