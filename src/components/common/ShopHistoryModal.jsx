import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  X,
  Store,
  Calendar,
  ShoppingBag,
  IndianRupee,
  RotateCcw,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  Tag,
  Package,
  Camera,
} from 'lucide-react';

export default function ShopHistoryModal({ shop, onClose }) {
  const { orders, collections, returns } = useData();
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'orders' | 'payments' | 'returns'
  const [expandedOrders, setExpandedOrders] = useState({});

  if (!shop) return null;

  const shopNorm = (shop.name || '').toLowerCase().trim();

  // 1. All Orders for this shop (both APP and OLD IMPORT)
  const shopOrders = orders
    .filter((o) => o.shopId === shop.id || (o.shopName && o.shopName.toLowerCase().trim() === shopNorm))
    .sort((a, b) => {
      // Sort newest first
      const dateA = a.date || a.createdDate || '';
      const dateB = b.date || b.createdDate || '';
      return dateB.localeCompare(dateA);
    });

  // 2. All Collections / Payments for this shop
  const shopCollections = collections
    .filter((c) => c.shopId === shop.id || (c.shopName && c.shopName.toLowerCase().trim() === shopNorm))
    .sort((a, b) => {
      const dateA = a.date || a.createdDate || '';
      const dateB = b.date || b.createdDate || '';
      return dateB.localeCompare(dateA);
    });

  // 3. All Returns / Credit Notes for this shop
  const shopReturns = returns
    .filter((r) => r.shopId === shop.id || (r.shopName && r.shopName.toLowerCase().trim() === shopNorm))
    .sort((a, b) => {
      const dateA = a.date || a.createdDate || '';
      const dateB = b.date || b.createdDate || '';
      return dateB.localeCompare(dateA);
    });

  // Aggregate Metrics
  const totalPurchaseVal = shopOrders.reduce((sum, o) => sum + (o.grandTotal || o.totalValue || o.subtotal || 0), 0);
  const totalCollectedVal = shopCollections.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalReturnedVal = shopReturns.reduce((sum, r) => sum + (r.returnValue || r.amount || 0), 0);
  const calculatedOutstanding = Math.max(0, totalPurchaseVal - totalCollectedVal - totalReturnedVal);

  const lastOrder = shopOrders[0];
  const lastPayment = shopCollections[0];

  const toggleOrderExpand = (ordId) => {
    setExpandedOrders((prev) => ({ ...prev, [ordId]: !prev[ordId] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white p-5 relative flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-extrabold text-[10px] uppercase tracking-wider">
              📜 COMPLETE SHOP HISTORY
            </span>
            {shop.source === 'OLD IMPORT' && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 font-bold text-[10px]">
                Imported Customer
              </span>
            )}
          </div>
          <h2 className="text-xl font-black mt-1 text-white">{shop.name}</h2>
          <p className="text-xs text-slate-300">
            Owner: <strong>{shop.owner || '—'}</strong> • Mobile: {shop.mobile || '—'} • Market: {shop.marketName || 'Pachore'}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-2 overflow-x-auto flex-shrink-0">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'summary'
                ? 'bg-slate-900 text-amber-300 shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Shop Summary
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
              activeTab === 'orders'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Orders ({shopOrders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
              activeTab === 'payments'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Payments ({shopCollections.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('returns')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
              activeTab === 'returns'
                ? 'bg-red-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Returns / CN ({shopReturns.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* ========================================================================= */}
          {/* TAB 1: SHOP SUMMARY                                                      */}
          {/* ========================================================================= */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Purchases</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">
                    ₹{totalPurchaseVal.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold">{shopOrders.length} Orders</p>
                </div>

                <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase">Total Payments</p>
                  <p className="text-lg font-black text-emerald-700 mt-0.5">
                    ₹{totalCollectedVal.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-semibold">{shopCollections.length} Recoveries</p>
                </div>

                <div className="bg-red-50/60 p-3.5 rounded-2xl border border-red-200">
                  <p className="text-[10px] font-bold text-red-800 uppercase">Credit Notes / Returns</p>
                  <p className="text-lg font-black text-red-700 mt-0.5">
                    ₹{totalReturnedVal.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-red-600 font-semibold">{shopReturns.length} Notes</p>
                </div>

                <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-300">
                  <p className="text-[10px] font-bold text-amber-900 uppercase">Outstanding Balance</p>
                  <p className="text-lg font-black text-amber-800 mt-0.5">
                    ₹{(shop.outstanding || calculatedOutstanding).toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px] text-amber-700 font-bold">Current Balance</span>
                </div>
              </div>

              {/* Last Transaction Status */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 border border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-amber-300 font-bold uppercase flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    RECENT ACTIVITY OVERVIEW
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Last Order Date:</span>
                    <span className="font-bold text-white">{lastOrder?.date || lastOrder?.createdDate || 'No orders yet'}</span>
                    {lastOrder && (
                      <span className="block text-[11px] text-amber-300 font-semibold mt-0.5">
                        ₹{(lastOrder.grandTotal || lastOrder.subtotal || 0).toLocaleString('en-IN')} (Inv #{lastOrder.invoiceNo || lastOrder.id})
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Last Payment Date:</span>
                    <span className="font-bold text-white">{lastPayment?.date || lastPayment?.createdDate || 'No payments yet'}</span>
                    {lastPayment && (
                      <span className="block text-[11px] text-emerald-400 font-semibold mt-0.5">
                        ₹{(lastPayment.amount || 0).toLocaleString('en-IN')} ({lastPayment.paymentMode || 'Cash'})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Products Bought Breakdown */}
              {shopOrders.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <h4 className="font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-slate-500" />
                    Frequently Purchased Items & Previous Rates
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(
                      new Set(
                        shopOrders.flatMap((o) => o.items || []).map((it) => `${it.productName}__${it.packSize || ''}__${it.pricePerKg || it.sellingPrice || ''}`)
                      )
                    ).map((keyStr, idx) => {
                      const [pName, pSize, pRate] = keyStr.split('__');
                      return (
                        <div
                          key={idx}
                          className="bg-white border border-slate-200 px-2.5 py-1 rounded-xl text-[11px] font-medium text-slate-700 shadow-2xs"
                        >
                          <strong>{pName}</strong> {pSize && `(${pSize})`} • Last Rate: <strong className="text-emerald-700">₹{pRate || 215}</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ORDER HISTORY                                                     */}
          {/* ========================================================================= */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              {shopOrders.length === 0 ? (
                <p className="py-8 text-center text-slate-400 font-bold">No orders recorded for this shop.</p>
              ) : (
                shopOrders.map((ord, idx) => {
                  const isExpanded = Boolean(expandedOrders[ord.id || idx]);
                  const isOldImport = ord.source === 'OLD IMPORT' || ord.dataSource === 'OLD IMPORT';

                  return (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 hover:border-amber-300 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {ord.date || ord.createdDate}
                            </span>
                            <span className="font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold text-slate-700">
                              Inv #{ord.invoiceNo || ord.invoiceRef || ord.id}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                isOldImport
                                  ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              }`}
                            >
                              {isOldImport ? 'OLD IMPORT' : 'APP ORDER'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {ord.items?.length || 1} Item(s) • Total KG: <strong>{ord.totalKg || 0} KG</strong>
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="font-black text-emerald-700 text-sm block">
                            ₹{(ord.grandTotal || ord.totalValue || ord.subtotal || 0).toLocaleString('en-IN')}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleOrderExpand(ord.id || idx)}
                            className="text-[10px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-0.5 mt-1 ml-auto"
                          >
                            <span>{isExpanded ? 'Hide Items' : 'View Items'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Items Details */}
                      {isExpanded && ord.items && ord.items.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1.5 mt-2">
                          <table className="w-full text-left text-[11px]">
                            <thead className="text-[9px] uppercase font-bold text-slate-400 border-b border-slate-100 pb-1">
                              <tr>
                                <th>Product</th>
                                <th>Pack</th>
                                <th className="text-right">Qty (KG)</th>
                                <th className="text-right">Rate</th>
                                <th className="text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-medium">
                              {ord.items.map((item, iIdx) => {
                                const rate = item.pricePerKg ?? item.sellingPrice ?? item.unitPrice ?? 0;
                                const qty = item.quantityKg ?? item.quantityPouch ?? item.quantity ?? 0;
                                const sub = item.subtotal ?? (qty * rate);

                                return (
                                  <tr key={iIdx}>
                                    <td className="py-1 font-bold text-slate-800">{item.productName}</td>
                                    <td className="py-1 text-slate-500">{item.packSize || '500g'}</td>
                                    <td className="py-1 text-right font-bold">{qty} {item.orderType === 'POUCH_10' ? 'Pouch' : 'KG'}</td>
                                    <td className="py-1 text-right font-bold text-emerald-700">₹{rate}</td>
                                    <td className="py-1 text-right font-black text-slate-900">₹{sub}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: PAYMENT HISTORY                                                   */}
          {/* ========================================================================= */}
          {activeTab === 'payments' && (
            <div className="space-y-2">
              {shopCollections.length === 0 ? (
                <p className="py-8 text-center text-slate-400 font-bold">No payment collections found.</p>
              ) : (
                shopCollections.map((col, idx) => {
                  const isOld = col.source === 'OLD IMPORT' || col.dataSource === 'OLD IMPORT';
                  return (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex justify-between items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            {col.date || col.createdDate}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 font-bold">
                            Ref: {col.receiptNumber || col.invoiceRef || col.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              isOld ? 'bg-blue-100 text-blue-900' : 'bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            {isOld ? 'OLD IMPORT' : 'APP'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Mode: <strong>{col.paymentMode || 'Cash'}</strong> {col.remark && `• ${col.remark}`}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-emerald-700 text-sm block">
                          ₹{(col.amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: CREDIT NOTES / RETURNS HISTORY                                    */}
          {/* ========================================================================= */}
          {activeTab === 'returns' && (
            <div className="space-y-2">
              {shopReturns.length === 0 ? (
                <p className="py-8 text-center text-slate-400 font-bold">No credit notes or returns recorded.</p>
              ) : (
                shopReturns.map((ret, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex justify-between items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {ret.date || ret.createdDate}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 font-bold">
                          Inv: {ret.invoiceNo || ret.invoiceRef || '—'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-100 text-red-900">
                          CREDIT NOTE
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        <strong>{ret.productName || 'Returned Product'}</strong> • {ret.quantityKg || 1} KG
                        {ret.reason && ` • Reason: ${ret.reason}`}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-red-700 text-sm block">
                        ₹{(ret.returnValue || ret.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Read-Only Historical Business Record</span>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
}
