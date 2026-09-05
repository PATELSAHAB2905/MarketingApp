import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  ShoppingBag,
  Search,
  Calendar,
  Store,
  IndianRupee,
  Eye,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function OrdersList() {
  const { orders, markets, marketers } = useData();
  const [filterMarket, setFilterMarket] = useState('ALL');
  const [filterMarketer, setFilterMarketer] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filteredOrders = orders.filter((o) => {
    if (filterMarket !== 'ALL' && o.marketId !== filterMarket) return false;
    if (filterMarketer !== 'ALL' && o.marketerId !== filterMarketer) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        o.id?.toLowerCase().includes(q) ||
        o.shopName?.toLowerCase().includes(q) ||
        o.marketerName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalKgSales = filteredOrders.reduce((sum, o) => sum + (o.totalKg || 0), 0);
  const totalPouchSales = filteredOrders.reduce((sum, o) => sum + (o.totalPouches || 0), 0);
  const totalGrandValue = filteredOrders.reduce((sum, o) => sum + (o.grandTotal || o.totalValue || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & KPI Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">ORDERS MANAGEMENT</h1>
          <p className="text-xs text-slate-500 font-medium">
            Real-time order submissions with complete rate/price breakdown & multi-product grouping
          </p>
        </div>
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex flex-wrap items-center gap-3 sm:gap-4 shadow-md">
          <span>Orders: <strong className="text-amber-300">{filteredOrders.length}</strong></span>
          <span className="text-slate-500">|</span>
          <span>KG Sales: <strong className="text-amber-300">{totalKgSales} KG</strong></span>
          <span className="text-slate-500">|</span>
          <span>₹10 Pouches: <strong className="text-red-300">{totalPouchSales}</strong></span>
          <span className="text-slate-500">|</span>
          <span>Total: <strong className="text-emerald-400">₹{totalGrandValue.toLocaleString('en-IN')}</strong></span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Filter Market</label>
          <select
            value={filterMarket}
            onChange={(e) => setFilterMarket(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="ALL">All Markets</option>
            {markets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Filter Marketer</label>
          <select
            value={filterMarketer}
            onChange={(e) => setFilterMarketer(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="ALL">All Marketers</option>
            {marketers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Search Order / Shop</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, Shop, Marketer..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-amber-300 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3.5">Order ID / Date</th>
                <th className="p-3.5">Shop Name</th>
                <th className="p-3.5">Marketer</th>
                <th className="p-3.5">Items, Pack, Quantity & Rate/Price</th>
                <th className="p-3.5 text-right">KG Sales</th>
                <th className="p-3.5 text-right">₹10 Pouches</th>
                <th className="p-3.5 text-right">Grand Total</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                    No order records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 align-top">
                      <span className="font-mono font-extrabold text-slate-900 block">{o.id}</span>
                      <span className="text-[11px] text-slate-400">{o.date || o.createdDate} {o.time || o.createdTime}</span>
                      {o.routeName && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-red-50 text-red-700 text-[9px] font-bold rounded">
                          Route: {o.routeName}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 align-top">
                      <span className="font-bold text-slate-900 block text-sm">{o.shopName}</span>
                      <span className="text-[10px] text-slate-400">{o.marketName || o.marketId}</span>
                    </td>
                    <td className="p-3.5 align-top text-slate-700 font-semibold">
                      {o.marketerName || '—'}
                    </td>
                    <td className="p-3.5 align-top">
                      <div className="flex flex-wrap gap-1.5 max-w-xl">
                        {o.items?.map((i, idx) => {
                          const isPouch = i.orderType === 'POUCH_10';
                          const rate = isPouch
                            ? (i.sellingPrice ?? i.unitPrice ?? 10)
                            : (i.pricePerKg ?? i.sellingPrice ?? i.unitPrice ?? 240);
                          const sub = i.subtotal != null
                            ? i.subtotal
                            : isPouch
                              ? (i.quantityPouch || i.quantity || 0) * rate
                              : (i.quantityKg || 0) * rate;

                          return (
                            <div
                              key={idx}
                              className="bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-300 rounded-xl px-2.5 py-1 text-[11px] font-medium text-slate-800 transition-colors"
                            >
                              <span className="font-black text-slate-900">{i.productName}</span>
                              {isPouch ? (
                                <span className="text-slate-600 ml-1">
                                  {i.packSize && (
                                    <span className="bg-red-100 text-red-800 font-bold px-1.5 py-0.2 rounded text-[10px] mr-1">
                                      {i.packSize}
                                    </span>
                                  )}
                                  <strong>{i.quantityPouch || i.quantity || 0} Pouches</strong> @{' '}
                                  <span className="font-extrabold text-red-700">₹{rate}/pouch</span> ={' '}
                                  <span className="font-black text-slate-900">₹{sub.toLocaleString('en-IN')}</span>
                                </span>
                              ) : (
                                <span className="text-slate-600 ml-1">
                                  {i.packSize && (
                                    <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded text-[10px] mr-1">
                                      {i.packSize}
                                    </span>
                                  )}
                                  <strong>{i.quantityKg || 0} KG</strong> @{' '}
                                  <span className="font-extrabold text-emerald-700">₹{rate}/KG</span> ={' '}
                                  <span className="font-black text-slate-900">₹{sub.toLocaleString('en-IN')}</span>
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-3.5 align-top text-right font-black text-amber-900 text-xs whitespace-nowrap">
                      {o.totalKg || 0} KG
                    </td>
                    <td className="p-3.5 align-top text-right font-black text-red-700 text-xs whitespace-nowrap">
                      {o.totalPouches || 0} Pouches
                    </td>
                    <td className="p-3.5 align-top text-right font-black text-emerald-700 text-sm whitespace-nowrap">
                      ₹{(o.grandTotal || o.totalValue || 0).toLocaleString('en-IN')}
                      {o.gstAmount > 0 && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          (Incl. GST ₹{o.gstAmount})
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 align-top text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors"
                        title="View Full Order Invoice"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== ORDER DETAIL / INVOICE MODAL ===== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white p-5 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">PATEL SAHAB SPICES</p>
                <h2 className="text-lg font-black font-mono">{selectedOrder.id}</h2>
                <p className="text-xs text-slate-300">
                  {selectedOrder.date || selectedOrder.createdDate} • {selectedOrder.time || selectedOrder.createdTime}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Order Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Shop Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedOrder.shopName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Marketer</span>
                  <span className="font-bold text-slate-800">{selectedOrder.marketerName || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Route / Market</span>
                  <span className="font-bold text-slate-800">{selectedOrder.routeName || selectedOrder.marketName || '—'}</span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="font-black text-slate-900 text-xs uppercase mb-2">Ordered Products Breakdown</h3>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-amber-300 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Product</th>
                        <th className="p-3">Pack Size</th>
                        <th className="p-3 text-right">Quantity (KG)</th>
                        <th className="p-3 text-right">Rate / Price</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {selectedOrder.items?.map((item, idx) => {
                        const isPouch = item.orderType === 'POUCH_10';
                        const rate = isPouch
                          ? (item.sellingPrice ?? item.unitPrice ?? 10)
                          : (item.pricePerKg ?? item.sellingPrice ?? item.unitPrice ?? 240);
                        const qtyText = isPouch
                          ? `${item.quantityPouch || item.quantity || 0} Pouches`
                          : `${item.quantityKg ?? item.quantity ?? 0} KG`;
                        const sub = item.subtotal != null
                          ? item.subtotal
                          : isPouch
                            ? (item.quantityPouch || item.quantity || 0) * rate
                            : (item.quantityKg || 0) * rate;

                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-3 font-extrabold text-slate-900">{item.productName}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded text-[10px]">
                                {item.packSize || (isPouch ? '₹10 MRP' : 'Standard')}
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold text-slate-800">{qtyText}</td>
                            <td className="p-3 text-right font-bold text-emerald-700">
                              ₹{rate} {isPouch ? '/pouch' : '/KG'}
                            </td>
                            <td className="p-3 text-right font-black text-slate-900">
                              ₹{sub.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Calculation Card */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal:</span>
                  <span className="font-bold text-white">₹{(selectedOrder.subtotal || selectedOrder.grandTotal || 0).toLocaleString('en-IN')}</span>
                </div>
                {selectedOrder.gstAmount > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>GST ({selectedOrder.gstRate || 5}% {selectedOrder.gstMode}):</span>
                    <span className="font-bold">₹{selectedOrder.gstAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                  <span className="text-amber-400">Grand Total:</span>
                  <span className="text-xl text-white">₹{(selectedOrder.grandTotal || selectedOrder.totalValue || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {selectedOrder.remark && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900">
                  <span className="font-bold uppercase text-[10px] block">Remark:</span>
                  <span>"{selectedOrder.remark}"</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
