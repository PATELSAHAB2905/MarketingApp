import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/common/StatusBadge';
import ShopHistoryModal from '../../components/common/ShopHistoryModal';
import { Store, Search, Plus, MapPin, IndianRupee, ChevronDown, FileText, Edit, Trash2, X, AlertTriangle } from 'lucide-react';

export default function ShopsMaster() {
  const { shops, markets, marketRoutes, connectedMarkets, addNewShop, updateShop, deleteShop, getShopOutstanding } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('ALL');
  const [selectedRoute, setSelectedRoute] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [historyShop, setHistoryShop] = useState(null);

  // Edit Party state
  const [editingShop, setEditingShop] = useState(null);
  const [editName, setEditName] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editMarketId, setEditMarketId] = useState('');
  const [editRouteId, setEditRouteId] = useState('');
  const [editConnectedMarketId, setEditConnectedMarketId] = useState('');
  const [editStatus, setEditStatus] = useState('Customer');
  const [editOutstanding, setEditOutstanding] = useState('');

  // Delete Party state
  const [deletingShop, setDeletingShop] = useState(null);
  const [deleteTransactions, setDeleteTransactions] = useState(true);

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

  const handleOpenEdit = (shop) => {
    setEditingShop(shop);
    setEditName(shop.name || '');
    setEditOwner(shop.owner || '');
    setEditMobile(shop.mobile || '');
    setEditAddress(shop.address || '');
    setEditMarketId(shop.marketId || markets[0]?.id || 'mkt-pachore');
    setEditRouteId(shop.routeId || '');
    setEditConnectedMarketId(shop.connectedMarketId || '');
    setEditStatus(shop.status || 'Customer');
    setEditOutstanding(shop.outstanding !== undefined ? String(shop.outstanding) : '0');
  };

  const handleUpdateShop = (e) => {
    e.preventDefault();
    if (!editingShop) return;
    const cm = connectedMarkets.find(c => c.id === editConnectedMarketId);
    updateShop(editingShop.id, {
      name: editName.trim(),
      owner: editOwner.trim(),
      mobile: editMobile.trim(),
      address: editAddress.trim(),
      marketId: editMarketId,
      routeId: editRouteId || undefined,
      connectedMarketId: editConnectedMarketId || undefined,
      connectedMarketName: cm?.name || undefined,
      status: editStatus,
      outstanding: editOutstanding ? Number(editOutstanding) : 0,
    });
    setEditingShop(null);
  };

  const handleDeleteConfirm = () => {
    if (!deletingShop) return;
    deleteShop(deletingShop.id, deleteTransactions);
    setDeletingShop(null);
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

  // Connected markets filtered by editRouteId in edit modal
  const editCms = editRouteId
    ? connectedMarkets.filter(c => c.routeId === editRouteId && c.active)
    : connectedMarkets.filter(c => c.active);

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
          <div key={shop.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3 relative group">
            <div className="flex justify-between items-start">
              <div className="pr-2">
                <h3 className="font-extrabold text-slate-900 text-base">{shop.name}</h3>
                <p className="text-xs text-slate-500 font-semibold">{shop.owner} • {shop.mobile}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <StatusBadge status={shop.status || 'Customer'} type="shop" />
              </div>
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
                {(() => {
                  const shopDue = getShopOutstanding ? getShopOutstanding(shop) : (shop.outstanding || 0);
                  return (
                    <span className={`font-black ${shopDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      ₹{shopDue.toLocaleString('en-IN')}
                    </span>
                  );
                })()}
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

            {/* Action Buttons: Edit & Delete */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleOpenEdit(shop)}
                className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-blue-200"
              >
                <Edit className="w-3.5 h-3.5 text-blue-600" />
                <span>Edit Party ✏️</span>
              </button>
              <button
                type="button"
                onClick={() => { setDeletingShop(shop); setDeleteTransactions(true); }}
                className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-red-200"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>Delete 🗑️</span>
              </button>
            </div>
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

      {/* Edit Modal */}
      {editingShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-600" />
                  EDIT PARTY / SHOP
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Rename party or update contact details & market location.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingShop(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <form id="edit-shop-form" onSubmit={handleUpdateShop} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Party / Shop Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Mahavir Kirana Store"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Changing the party name will automatically update all existing orders, collections, and statement ledgers.</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Owner Name *</label>
                    <input
                      type="text"
                      required
                      value={editOwner}
                      onChange={(e) => setEditOwner(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Mobile / Phone *</label>
                    <input
                      type="tel"
                      required
                      value={editMobile}
                      onChange={(e) => setEditMobile(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Address</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Main Market, Akodiya"
                  />
                </div>

                {/* Two-Level Market Linkage */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-3">
                  <p className="text-[10px] font-black text-amber-800 uppercase">Market Linkage (Two-Level)</p>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Market Route</label>
                    <select
                      value={editRouteId}
                      onChange={(e) => { setEditRouteId(e.target.value); setEditConnectedMarketId(''); }}
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
                      value={editConnectedMarketId}
                      onChange={(e) => setEditConnectedMarketId(e.target.value)}
                      className="w-full border border-amber-200 bg-white rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      disabled={!editRouteId && editCms.length === 0}
                    >
                      <option value="">— Select Connected Market (Optional) —</option>
                      {editCms.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Legacy Market */}
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Legacy Market *</label>
                  <select
                    value={editMarketId}
                    onChange={(e) => setEditMarketId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Customer">Customer</option>
                      <option value="Lead">Lead</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Outstanding Balance (₹)</label>
                    <input
                      type="number"
                      value={editOutstanding}
                      onChange={(e) => setEditOutstanding(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => setEditingShop(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-shop-form"
                className="flex-1 py-3 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-700 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900">Delete Party / Shop?</h3>
              <p className="text-xs text-slate-500 font-medium">
                Are you sure you want to delete <strong className="text-slate-800">{deletingShop.name}</strong>?
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-2">
              <label className="flex items-start gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={deleteTransactions}
                  onChange={(e) => setDeleteTransactions(e.target.checked)}
                  className="mt-0.5 rounded text-red-600 focus:ring-red-500"
                />
                <span>Also delete all linked transactions (orders, collections, returns) for this party</span>
              </label>
              <p className="text-[10px] text-slate-400 pl-5">
                {deleteTransactions
                  ? 'All bills, receipts, and returns of this party will be permanently removed.'
                  : 'Ledger records will remain in database but party master profile will be removed.'}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingShop(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 bg-red-700 text-white font-bold rounded-xl hover:bg-red-800 text-xs"
              >
                Delete Party
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
