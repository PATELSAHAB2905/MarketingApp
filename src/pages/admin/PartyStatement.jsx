import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import PartyStatementDetail from '../../components/common/PartyStatementDetail';
import StatusBadge from '../../components/common/StatusBadge';
import {
  FileSpreadsheet,
  Search,
  Store,
  Phone,
  MapPin,
  IndianRupee,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Layers,
  User,
  AlertCircle,
  FileText,
  TrendingUp,
} from 'lucide-react';

export default function PartyStatement() {
  const { shops, markets, marketRoutes, marketers, orders, collections, returns } = useData();

  const [selectedShop, setSelectedShop] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('ALL');
  const [selectedRoute, setSelectedRoute] = useState('ALL');
  const [selectedMarketer, setSelectedMarketer] = useState('ALL');
  const [outstandingFilter, setOutstandingFilter] = useState('ALL'); // 'ALL' | 'WITH_DUES' | 'ZERO'
  const [sortBy, setSortBy] = useState('OUTSTANDING_DESC'); // 'OUTSTANDING_DESC' | 'OUTSTANDING_ASC' | 'NAME_ASC' | 'LAST_ORDER'

  // Pre-calculate live outstanding & transaction metrics for all shops
  const enrichedShops = useMemo(() => {
    return shops.map((s) => {
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
        ordersCount: shopOrders.length,
        paymentsCount: shopCols.length,
      };
    });
  }, [shops, orders, collections, returns]);

  // Filtered and Sorted Shops
  const filteredShops = useMemo(() => {
    let result = enrichedShops.filter((s) => {
      // 1. Text Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.name.toLowerCase().includes(q);
        const matchOwner = s.owner && s.owner.toLowerCase().includes(q);
        const matchMobile = s.mobile && s.mobile.includes(q);
        const matchAddress = s.address && s.address.toLowerCase().includes(q);
        if (!matchName && !matchOwner && !matchMobile && !matchAddress) return false;
      }

      // 2. Market Filter
      if (selectedMarket !== 'ALL' && s.marketId !== selectedMarket && s.marketName !== selectedMarket) {
        return false;
      }

      // 3. Route Filter
      if (selectedRoute !== 'ALL' && s.routeId !== selectedRoute) {
        return false;
      }

      // 4. Marketer Filter
      if (selectedMarketer !== 'ALL' && s.assignedMarketerId !== selectedMarketer && s.marketerId !== selectedMarketer) {
        return false;
      }

      // 5. Outstanding Filter
      if (outstandingFilter === 'WITH_DUES' && s.computedOutstanding <= 0) return false;
      if (outstandingFilter === 'ZERO' && s.computedOutstanding > 0) return false;

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'OUTSTANDING_DESC') return b.computedOutstanding - a.computedOutstanding;
      if (sortBy === 'OUTSTANDING_ASC') return a.computedOutstanding - b.computedOutstanding;
      if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
      if (sortBy === 'LAST_ORDER') return (b.lastTransactionDate || '').localeCompare(a.lastTransactionDate || '');
      return 0;
    });

    return result;
  }, [enrichedShops, searchQuery, selectedMarket, selectedRoute, selectedMarketer, outstandingFilter, sortBy]);

  // Overall Ledger Totals
  const totalMarketOutstanding = enrichedShops.reduce((sum, s) => sum + (s.computedOutstanding || 0), 0);
  const totalMarketSales = enrichedShops.reduce((sum, s) => sum + (s.totalSales || 0), 0);
  const totalMarketPaid = enrichedShops.reduce((sum, s) => sum + (s.totalPaid || 0), 0);

  // If a shop is selected, render the detailed Vyapar statement
  if (selectedShop) {
    return (
      <PartyStatementDetail
        shop={selectedShop}
        onBack={() => setSelectedShop(null)}
      />
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-900 text-amber-300 uppercase tracking-widest">
              ACCOUNTING & LEDGER
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
              VYAPAR FORMAT
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase mt-1 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-red-700" />
            PARTY STATEMENT / PARTY LEDGER
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Search parties, track live running ledgers, debit/credit transactions, opening & closing balances.
          </p>
        </div>
      </div>

      {/* KPI Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Parties / Shops</p>
          <p className="text-2xl font-black text-slate-900 mt-0.5">{enrichedShops.length}</p>
          <span className="text-[10px] text-slate-400 font-medium">All active customer accounts</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-red-700 uppercase">Total Lifetime Sales</p>
          <p className="text-2xl font-black text-red-700 mt-0.5">
            ₹{totalMarketSales.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-red-600 font-medium">Gross sales across parties</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-emerald-700 uppercase">Total Lifetime Collections</p>
          <p className="text-2xl font-black text-emerald-700 mt-0.5">
            ₹{totalMarketPaid.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium">Recovered payments</span>
        </div>

        <div className="bg-amber-50 p-4 rounded-3xl border border-amber-300 shadow-xs">
          <p className="text-[10px] font-black text-amber-900 uppercase">Total Market Dues</p>
          <p className="text-2xl font-black text-amber-950 mt-0.5">
            ₹{totalMarketOutstanding.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-amber-800 font-bold">Total net outstanding</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          {/* Search Box */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by party name, owner, mobile, village..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          {/* Market Route */}
          <div>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="ALL">All Market Routes</option>
              {marketRoutes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} Route
                </option>
              ))}
            </select>
          </div>

          {/* Outstanding Filter */}
          <div>
            <select
              value={outstandingFilter}
              onChange={(e) => setOutstandingFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="ALL">All Balances</option>
              <option value="WITH_DUES">Only With Outstanding (&gt; ₹0)</option>
              <option value="ZERO">Zero Balance / Settled</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="OUTSTANDING_DESC">Highest Dues First</option>
              <option value="OUTSTANDING_ASC">Lowest Dues First</option>
              <option value="NAME_ASC">Party Name (A-Z)</option>
              <option value="LAST_ORDER">Recent Transaction First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Parties Table / Card List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-900 uppercase">
            SHOWING {filteredShops.length} PARTIES / CUSTOMERS
          </h3>
          <span className="text-xs font-bold text-slate-500">
            Click on any party to open detailed Vyapar ledger statement
          </span>
        </div>

        {filteredShops.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Store className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700">No parties found</p>
            <p className="text-xs">Try adjusting your search terms or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-extrabold text-[10px]">
                <tr>
                  <th className="p-3.5">Party / Shop Name</th>
                  <th className="p-3.5">Market & Route</th>
                  <th className="p-3.5">Owner & Mobile</th>
                  <th className="p-3.5 text-right">Total Sales</th>
                  <th className="p-3.5 text-right">Total Paid</th>
                  <th className="p-3.5 text-right">Outstanding (Closing)</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredShops.map((shop) => (
                  <tr
                    key={shop.id}
                    onClick={() => setSelectedShop(shop)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-black text-xs flex-shrink-0">
                          {shop.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-black text-slate-900 text-sm block">{shop.name}</span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            Last Activity: {shop.lastTransactionDate}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className="font-bold text-slate-800 block">
                        {shop.connectedMarketName || shop.marketName || 'Pachore'}
                      </span>
                      {shop.routeId && (
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          {shop.routeId}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <span className="font-bold text-slate-800 block">{shop.owner || '—'}</span>
                      <span className="text-slate-500 font-mono text-[11px]">{shop.mobile || '—'}</span>
                    </td>

                    <td className="p-3.5 text-right font-black text-red-700">
                      ₹{shop.totalSales.toLocaleString('en-IN')}
                    </td>

                    <td className="p-3.5 text-right font-black text-emerald-700">
                      ₹{shop.totalPaid.toLocaleString('en-IN')}
                    </td>

                    <td className="p-3.5 text-right">
                      <span
                        className={`font-black text-sm block ${
                          shop.computedOutstanding > 0 ? 'text-red-700' : 'text-emerald-700'
                        }`}
                      >
                        ₹{shop.computedOutstanding.toLocaleString('en-IN')}
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          shop.computedOutstanding <= 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {shop.computedOutstanding <= 0 ? 'Settled' : 'Dues'}
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedShop(shop);
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1 shadow-2xs mx-auto"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Statement</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
