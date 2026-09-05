import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/common/StatusBadge';
import ShopHistoryModal from '../../components/common/ShopHistoryModal';
import { Store, Search, Plus, MapPin, IndianRupee, ChevronDown, FileText } from 'lucide-react';

export default function ShopsMaster() {
  const { shops, markets, marketRoutes, connectedMarkets, addNewShop } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('ALL');
  const [selectedRoute, setSelectedRoute] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [historyShop, setHistoryShop] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [marketId, setMarketId] = useState(markets[0]?.id || 'mkt-pachore');
  const [routeId, setRouteId] = useState('');
  const [connectedMarketId, setConnectedMarketId] = useState('');
  const [status, setStatus] = useState('Customer');
  const [openingOutstanding, setOpeningOutstanding] = useState('');

  // Connected markets filtered by selected routeId in the form
  const formCms = routeId
    ? connectedMarkets.filter(c => c.routeId === routeId && c.active)
    : connectedMarkets.filter(c => c.active);

  const filteredShops = shops.filter((s) => {
    // 1. Route Filter
    if (selectedRoute !== 'ALL') {
      const routeObj = marketRoutes.find(r => r.id === selectedRoute);
      const routeName = routeObj ? routeObj.name.toLowerCase().trim() : '';
      const routeKey = selectedRoute.replace('route-', '').toLowerCase().trim();
      const cmsForRoute = connectedMarkets.filter(c => c.routeId === selectedRoute).map(c => c.id);
      const cmsNamesForRoute = connectedMarkets.filter(c => c.routeId === selectedRoute).map(c => c.name.toLowerCase().trim());

      const isRouteMatch =
        s.routeId === selectedRoute ||
        (s.marketId && s.marketId.toLowerCase().includes(routeKey)) ||
        (s.marketName && s.marketName.toLowerCase().trim() === routeName) ||
        (s.connectedMarketId && cmsForRoute.includes(s.connectedMarketId)) ||
        (s.connectedMarketName && (s.connectedMarketName.toLowerCase().trim() === routeName || cmsNamesForRoute.includes(s.connectedMarketName.toLowerCase().trim())));

      if (!isRouteMatch) return false;
    }

    // 2. Market Filter
    if (selectedMarket !== 'ALL') {
      const marketObj = markets.find(m => m.id === selectedMarket);
      const marketName = marketObj ? marketObj.name.toLowerCase().trim() : '';
      const marketKey = selectedMarket.replace('mkt-', '').toLowerCase().trim();

      const isMarketMatch =
        s.marketId === selectedMarket ||
        (s.marketId && s.marketId.toLowerCase().includes(marketKey)) ||
        (s.marketName && s.marketName.toLowerCase().trim() === marketName) ||
        (s.connectedMarketName && s.connectedMarketName.toLowerCase().trim() === marketName) ||
        (s.connectedMarketId && s.connectedMarketId === selectedMarket);

      if (!isMarketMatch) return false;
    }

    // 3. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.owner && s.owner.toLowerCase().includes(q)) ||
        (s.mobile && s.mobile.includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.marketName && s.marketName.toLowerCase().includes(q)) ||
        (s.connectedMarketName && s.connectedMarketName.toLowerCase().includes(q))
      );
    }

    return true;
  });

  // Helper to get connected market name for display
  const getCmName = (shop) => {
    if (shop.connectedMarketName) return shop.connectedMarketName;
    if (shop.connectedMarketId) {
      const cm = connectedMarkets.find(c => c.id === shop.connectedMarketId);
      if (cm) return cm.name;
    }
    if (shop.marketName) return shop.marketName;
    if (shop.marketId) {
      const m = markets.find(m => m.id === shop.marketId);
      if (m) return m.name;
    }
    return '—';
  };

  const getRouteName = (shop) => {
    if (shop.routeId) {
      const r = marketRoutes.find(r => r.id === shop.routeId);
      if (r) return r.name;
    }
    if (shop.marketId) {
      const rKey = shop.marketId.replace('mkt-', '');
      const r = marketRoutes.find(r => r.id === `route-${rKey}` || r.name.toLowerCase() === rKey);
      if (r) return r.name;
    }
    if (shop.marketName) return shop.marketName;
    return '';
  };

  const handleSaveShop = (e) => {
    e.preventDefault();
    const cm = connectedMarkets.find(c => c.id === connectedMarketId);
    addNewShop({
      name,
      owner,
      mobile,
      address,
      marketId,
      routeId: routeId || undefined,
      connectedMarketId: connectedMarketId || undefined,
      connectedMarketName: cm?.name || undefined,
      status,
      outstanding: openingOutstanding ? Number(openingOutstanding) : 0,
      lastOrderKg: 0,
    });
    setShowAddModal(false);
    setName(''); setOwner(''); setMobile(''); setAddress('');
    setRouteId(''); setConnectedMarketId(''); setOpeningOutstanding('');
    setStatus('Customer');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">SHOPS MASTER DATABASE</h1>
          <p className="text-xs text-slate-500 font-medium">Customer accounts, outstanding balances, and status allocation</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-md"
        >
          <Plus className="w-4 h-4" />
          ADD NEW SHOP
        </button>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shop by name, owner, mobile..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-xs font-bold"
          />
        </div>

        <select
          value={selectedRoute}
          onChange={(e) => { setSelectedRoute(e.target.value); setSelectedMarket('ALL'); }}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold"
        >
          <option value="ALL">All Routes</option>
          {marketRoutes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} Route
            </option>
          ))}
        </select>

        <select
          value={selectedMarket}
          onChange={(e) => setSelectedMarket(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold"
        >
          <option value="ALL">All Markets ({filteredShops.length} Shops)</option>
          {markets.map((m) => {
            const count = shops.filter(
              (s) =>
                s.marketId === m.id ||
                (s.marketName && s.marketName.toLowerCase().trim() === m.name.toLowerCase().trim()) ||
                (s.connectedMarketName && s.connectedMarketName.toLowerCase().trim() === m.name.toLowerCase().trim())
            ).length;
            return (
              <option key={m.id} value={m.id}>
                {m.name} ({count} Shops)
              </option>
            );
          })}
        </select>
      </div>

      {/* Shops Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredShops.length === 0 && (
          <div className="col-span-3 bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
            No shops found for the selected filter.
          </div>
        )}
        {filteredShops.map((shop) => (
          <div key={shop.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{shop.name}</h3>
                <p className="text-xs text-slate-500 font-semibold">{shop.owner} • {shop.mobile}</p>
              </div>
              <StatusBadge status={shop.status || 'Customer'} type="shop" />
            </div>

            {/* Market / Route badges */}
            <div className="flex flex-wrap gap-1.5">
              {getRouteName(shop) && (
                <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded-full border border-red-100">
                  {getRouteName(shop)} Route
                </span>
              )}
              <span className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-full border border-amber-100">
                {getCmName(shop)}
              </span>
            </div>

            <p className="text-xs text-slate-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
              <span>{shop.address || 'Main Market'}</span>
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
              <div className="bg-slate-50 p-2 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Outstanding</span>
                <span className={`font-black ${shop.outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  ₹{(shop.outstanding || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Last Order</span>
                <span className="font-extrabold text-slate-800">
                  {shop.lastOrderKg ? `${shop.lastOrderKg} KG` : 'None'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setHistoryShop(shop)}
              className="w-full py-2 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-200"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>View Full Shop Ledger & History 📜</span>
            </button>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900">ADD NEW SHOP MASTER</h2>
              <p className="text-xs text-slate-400 mt-1">Fill in shop details. Route and Connected Market fields link this shop to the two-level market hierarchy.</p>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <form id="shop-form" onSubmit={handleSaveShop} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Shop Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g., Gupta Kirana Store"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Owner *</label>
                    <input
                      type="text"
                      required
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2 font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Mobile *</label>
                    <input
                      type="tel"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2 font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g., Main Market Road, Pachore"
                  />
                </div>

                {/* Two-Level Market Linkage */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-3">
                  <p className="text-[10px] font-black text-amber-800 uppercase">Market Linkage (Two-Level)</p>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Market Route</label>
                    <select
                      value={routeId}
                      onChange={(e) => { setRouteId(e.target.value); setConnectedMarketId(''); }}
                      className="w-full border border-amber-200 bg-white rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">— Select Route (Optional) —</option>
                      {marketRoutes.filter(r => r.active).map((r) => (
                        <option key={r.id} value={r.id}>{r.name} Route</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Connected Market</label>
                    <select
                      value={connectedMarketId}
                      onChange={(e) => setConnectedMarketId(e.target.value)}
                      className="w-full border border-amber-200 bg-white rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      disabled={!routeId && formCms.length === 0}
                    >
                      <option value="">— Select Connected Market (Optional) —</option>
                      {formCms.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Legacy Market (backward compat) */}
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Legacy Market *</label>
                  <select
                    value={marketId}
                    onChange={(e) => setMarketId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {markets.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="Customer">Customer</option>
                      <option value="Lead">Lead</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Opening Outstanding (₹)</label>
                    <input
                      type="number"
                      value={openingOutstanding}
                      onChange={(e) => setOpeningOutstanding(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="shop-form"
                className="flex-1 py-3 bg-red-700 text-white font-bold rounded-xl hover:bg-red-800"
              >
                Save Shop
              </button>
            </div>
          </div>
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
