import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/common/StatusBadge';
import {
  IndianRupee,
  ShieldCheck,
  AlertTriangle,
  Search,
  Camera,
  Eye,
  X,
  Store,
  Calendar,
  CreditCard,
  FileSpreadsheet,
} from 'lucide-react';

export default function CollectionsHandover() {
  const { collections, handovers, marketers } = useData();
  const [activeTab, setActiveTab] = useState('collections'); // 'collections' or 'handovers'
  const [filterMarketer, setFilterMarketer] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const filteredCollections = collections.filter((c) => {
    if (filterMarketer !== 'ALL' && c.marketerId !== filterMarketer) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.shopName?.toLowerCase().includes(q) ||
        c.marketerName?.toLowerCase().includes(q) ||
        c.receiptNumber?.toLowerCase().includes(q) ||
        c.invoiceRef?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalCollected = collections.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalFilteredCollected = filteredCollections.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalHandedOver = handovers.reduce((sum, h) => sum + (h.totalHandedOver || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & KPI Summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">COLLECTIONS & HANDOVER AUDIT</h1>
          <p className="text-xs text-slate-500 font-medium">
            Real-time payment recoveries from shops, physical slip photo proof & evening godown handovers
          </p>
        </div>
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex flex-wrap items-center gap-4 shadow-md">
          <span>Total Collections: <strong className="text-emerald-400">₹{totalCollected.toLocaleString('en-IN')}</strong></span>
          <span className="text-slate-500">|</span>
          <span>Handovers: <strong className="text-amber-300">₹{totalHandedOver.toLocaleString('en-IN')}</strong></span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('collections')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'collections'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Shop-Wise Collections ({collections.length})
        </button>
        <button
          onClick={() => setActiveTab('handovers')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'handovers'
              ? 'bg-slate-900 text-amber-300 shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Evening Godown Handovers ({handovers.length})
        </button>
      </div>

      {activeTab === 'collections' ? (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Filter Marketer</label>
              <select
                value={filterMarketer}
                onChange={(e) => setFilterMarketer(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Search Shop / Receipt</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by shop, marketer, receipt #..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Collections Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
              <span className="font-black text-slate-900 uppercase">
                Payment Collection Entries ({filteredCollections.length} Records)
              </span>
              <span className="font-bold text-emerald-700">
                Filtered Sum: ₹{totalFilteredCollected.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-amber-300 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Receipt # / Date</th>
                    <th className="p-3.5">Shop Name</th>
                    <th className="p-3.5">Marketer</th>
                    <th className="p-3.5">Payment Mode</th>
                    <th className="p-3.5 text-right">Amount Collected</th>
                    <th className="p-3.5 text-right">Remaining Due</th>
                    <th className="p-3.5 text-center">Slip Proof Photo</th>
                    <th className="p-3.5">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredCollections.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                        No collection records found.
                      </td>
                    </tr>
                  ) : (
                    filteredCollections.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="p-3.5 align-middle font-mono">
                          <span className="font-bold text-slate-900 block">{c.receiptNumber || c.id}</span>
                          <span className="text-[10px] text-slate-400">{c.date || c.createdDate} {c.time || c.createdTime}</span>
                        </td>
                        <td className="p-3.5 align-middle">
                          <span className="font-extrabold text-slate-900 text-sm block">{c.shopName}</span>
                          <span className="text-[10px] text-slate-400 uppercase">{c.marketName || c.marketId}</span>
                        </td>
                        <td className="p-3.5 align-middle text-slate-700 font-semibold">{c.marketerName || '—'}</td>
                        <td className="p-3.5 align-middle">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            c.paymentMode === 'Cash' ? 'bg-emerald-100 text-emerald-800' :
                            c.paymentMode === 'UPI' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {c.paymentMode || 'Cash'}
                          </span>
                        </td>
                        <td className="p-3.5 align-middle text-right font-black text-emerald-700 text-sm whitespace-nowrap">
                          ₹{(c.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3.5 align-middle text-right font-bold text-slate-600 whitespace-nowrap">
                          ₹{(c.remainingOutstanding != null ? c.remainingOutstanding : (c.previousOutstanding || 0) - (c.amount || 0)).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3.5 align-middle text-center">
                          {c.slipPhoto ? (
                            <button
                              onClick={() => setPreviewPhoto({ url: c.slipPhoto, title: `${c.shopName} - Slip Proof` })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-[10px] font-bold shadow-xs transition-all"
                            >
                              <Camera className="w-3.5 h-3.5 text-emerald-600" />
                              <span>View Slip</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No Photo</span>
                          )}
                        </td>
                        <td className="p-3.5 align-middle text-slate-500 max-w-[150px] truncate" title={c.remark || c.invoiceRef}>
                          {c.remark || c.invoiceRef || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Handover Verification Section */
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            EVENING COLLECTION HANDOVER LOGS
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-amber-300 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3.5">Date / Time</th>
                  <th className="p-3.5">Marketer</th>
                  <th className="p-3.5">Market</th>
                  <th className="p-3.5 text-right">Recorded Total</th>
                  <th className="p-3.5 text-right">Handed Over</th>
                  <th className="p-3.5 text-right">Difference</th>
                  <th className="p-3.5">Handover Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {handovers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400 font-bold">
                      No evening handovers recorded today yet.
                    </td>
                  </tr>
                ) : (
                  handovers.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-slate-800">{h.createdDate} {h.createdTime}</td>
                      <td className="p-3.5 font-bold text-slate-900">{h.marketerName}</td>
                      <td className="p-3.5 text-slate-600 uppercase font-semibold">{h.marketName || 'Pachore'}</td>
                      <td className="p-3.5 text-right font-black text-slate-900">₹{(h.totalRecorded || 0).toLocaleString('en-IN')}</td>
                      <td className="p-3.5 text-right font-black text-emerald-700">₹{(h.totalHandedOver || 0).toLocaleString('en-IN')}</td>
                      <td className="p-3.5 text-right font-black text-red-600">
                        {h.difference !== 0 ? `₹${h.difference}` : '₹0'}
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={h.status || 'Verified'} type="handover" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slip Photo Zoom Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-black text-slate-900 text-sm">{previewPhoto.title}</h3>
              <button onClick={() => setPreviewPhoto(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black/5 border border-slate-200">
              <img src={previewPhoto.url} alt="Slip" className="w-full max-h-96 object-contain" />
            </div>
            <button
              onClick={() => setPreviewPhoto(null)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
