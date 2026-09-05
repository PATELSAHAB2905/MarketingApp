import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  MapPin,
  Plus,
  Store,
  Fuel,
  Users,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Save,
  Search,
} from 'lucide-react';

export default function MarketsMaster() {
  const { markets, setMarkets, marketers, shops, assignMarketToMarketer } = useData();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New Market Form State
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('Shajapur');
  const [distanceKm, setDistanceKm] = useState(50);
  const [fuelRateKm, setFuelRateKm] = useState(2);
  const [selectedMarketerId, setSelectedMarketerId] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const handleAddMarket = (e) => {
    e.preventDefault();
    const assignedMarketer = marketers.find((m) => m.id === selectedMarketerId);
    const newMkt = {
      id: `mkt-${name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-')}`,
      name: name.trim(),
      district: district.trim(),
      distanceKm: Number(distanceKm),
      fuelRateKm: Number(fuelRateKm),
      maxFuelAllowed: Number(distanceKm) * Number(fuelRateKm),
      assignedMarketerId: selectedMarketerId || null,
      assignedMarketerName: assignedMarketer ? assignedMarketer.name : null,
      totalShops: 0,
    };
    setMarkets([...markets, newMkt]);
    setShowModal(false);
    setName('');
    setSelectedMarketerId('');
    showSuccessToast(`Market "${newMkt.name}" added successfully!`);
  };

  const handleAssignChange = (marketId, newMarketerId) => {
    assignMarketToMarketer(marketId, newMarketerId);
    const mkt = markets.find((m) => m.id === marketId);
    const marketer = marketers.find((m) => m.id === newMarketerId);
    showSuccessToast(
      `Market "${mkt?.name}" assigned to ${marketer?.name || 'Unassigned'}! All parties now available on marketer dashboard.`
    );
  };

  const showSuccessToast = (msg) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Filter markets by search
  const filteredMarkets = markets.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.district && m.district.toLowerCase().includes(q)) ||
      (m.assignedMarketerName && m.assignedMarketerName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-800">
      {/* Toast Alert */}
      {saveSuccessMsg && (
        <div className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-lg flex items-center gap-2 text-xs font-black animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              MARKETS MASTER DATABASE
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black uppercase">
              {markets.length} Markets
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Manage distribution markets, approved fuel rates, and assign Marketers
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-md active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>ADD NEW MARKET</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Market Name, District or Marketer..."
          className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-semibold focus:ring-2 focus:ring-red-600"
        />
      </div>

      {/* Markets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMarkets.map((m) => {
          // Dynamic stats
          const mNorm = m.name.toLowerCase().trim();
          const marketShops = shops.filter(
            (s) =>
              s.marketId === m.id ||
              (s.marketName && s.marketName.toLowerCase().trim() === mNorm) ||
              (s.connectedMarketName && s.connectedMarketName.toLowerCase().trim() === mNorm)
          );
          const totalParties = marketShops.length;
          const totalDue = marketShops.reduce((sum, s) => sum + Number(s.outstanding || 0), 0);

          return (
            <div
              key={m.id}
              className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3.5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg uppercase flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>{m.name}</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-bold">{m.district || 'Shajapur'} District</p>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-black rounded-xl">
                    {m.distanceKm || 50} KM
                  </span>
                </div>

                {/* Market Assigned Marketer Selector */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Assigned Marketer:</span>
                  </label>
                  <select
                    value={m.assignedMarketerId || ''}
                    onChange={(e) => handleAssignChange(m.id, e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-extrabold text-slate-800 focus:ring-2 focus:ring-red-600 cursor-pointer"
                  >
                    <option value="">-- Unassigned (Click to Assign) --</option>
                    {marketers.map((mk) => (
                      <option key={mk.id} value={mk.id}>
                        {mk.name} ({mk.mobile})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 font-semibold italic">
                    {m.assignedMarketerName
                      ? `✓ All ${totalParties} parties visible to ${m.assignedMarketerName}`
                      : 'Assign a marketer to show this market on their dashboard'}
                  </p>
                </div>

                {/* Live Parties & Dues Summary */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Parties</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {totalParties} Shops
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Market Total Due</span>
                    <span className={`font-black text-sm ${totalDue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      ₹{totalDue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Fuel Allowance info */}
              <div className="flex justify-between items-center text-[11px] pt-2 border-t border-slate-100 text-slate-500 font-semibold">
                <span className="flex items-center gap-1">
                  <Fuel className="w-3.5 h-3.5 text-slate-400" />
                  <span>Allowance: ₹{(m.distanceKm || 50) * (m.fuelRateKm || 2)}</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400 font-bold">{m.id}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Market Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <h2 className="text-xl font-black text-slate-900 uppercase">ADD NEW MARKET</h2>
            <form onSubmit={handleAddMarket} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Market Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Akodia, Chakrod, Tarana..."
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">District *</label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Shajapur, Rajgarh, Ujjain, Sehore..."
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Assign Initial Marketer</label>
                <select
                  value={selectedMarketerId}
                  onChange={(e) => setSelectedMarketerId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800"
                >
                  <option value="">-- Select Marketer (Optional) --</option>
                  {marketers.map((mk) => (
                    <option key={mk.id} value={mk.id}>
                      {mk.name} ({mk.mobile})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Approved Distance (KM)</label>
                  <input
                    type="number"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Fuel Rate (₹/KM)</label>
                  <input
                    type="number"
                    value={fuelRateKm}
                    onChange={(e) => setFuelRateKm(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl shadow-md"
                >
                  Save Market
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
