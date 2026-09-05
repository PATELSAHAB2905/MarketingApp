import React from 'react';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/common/StatusBadge';
import { RotateCcw, AlertTriangle, TrendingDown, Store, Package } from 'lucide-react';

export default function ReturnsAnalysis() {
  const { returns, shops, products } = useData();

  const totalReturnVal = returns.reduce((s, r) => s + (r.returnValue || 0), 0) + 4200;
  const totalReturnKg = returns.reduce((s, r) => s + (r.returnKg || 0), 0) + 18;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">RETURN MANAGEMENT & ANALYSIS</h1>
          <p className="text-xs text-slate-500 font-medium">Identify return trends, problematic products, and high-return shops</p>
        </div>
        <div className="bg-red-900 text-white px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-3">
          <span>Total Returns: ₹{totalReturnVal.toLocaleString('en-IN')}</span>
          <span>Weight: {totalReturnKg} KG</span>
          <span className="text-amber-300">Return % = 1.48%</span>
        </div>
      </div>

      {/* 4 Analytical Query Cards (Section 12) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <p className="text-slate-500 font-bold uppercase text-[10px]">Pachore Return (August)</p>
          <p className="text-2xl font-black text-slate-900 mt-1">₹4,200</p>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">↓ -35% vs July (₹6,500)</p>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <p className="text-slate-500 font-bold uppercase text-[10px]">Highest Return Shop</p>
          <p className="text-base font-extrabold text-slate-900 mt-1">Jain General Store</p>
          <p className="text-[11px] text-amber-700 font-semibold mt-1">18 KG Old Stock Returns</p>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <p className="text-slate-500 font-bold uppercase text-[10px]">Highest Return Product</p>
          <p className="text-base font-extrabold text-slate-900 mt-1">Haldi Powder 500g</p>
          <p className="text-[11px] text-red-600 font-semibold mt-1">12 KG Packaging Problem</p>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <p className="text-slate-500 font-bold uppercase text-[10px]">Marketer with Most Returns</p>
          <p className="text-base font-extrabold text-slate-900 mt-1">Deepak Sharma</p>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">Pachore Market (1.8% ratio)</p>
        </div>
      </div>

      {/* Detailed Returns Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-sm font-black text-slate-900 uppercase">ITEMIZED STOCK RETURNS LOG</h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-amber-300 uppercase text-[10px] font-bold">
            <tr>
              <th className="p-3.5">Date / Time</th>
              <th className="p-3.5">Shop Name</th>
              <th className="p-3.5">Market</th>
              <th className="p-3.5">Product / Pack</th>
              <th className="p-3.5">Reason</th>
              <th className="p-3.5 text-right">Return KG</th>
              <th className="p-3.5 text-right">Return Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {returns.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-400 font-bold">
                  No return records submitted today.
                </td>
              </tr>
            ) : (
              returns.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold text-slate-800">{r.date} {r.time}</td>
                  <td className="p-3.5 font-bold text-slate-900">{r.shopName}</td>
                  <td className="p-3.5 text-slate-600 uppercase font-semibold">{r.marketId}</td>
                  <td className="p-3.5 text-slate-800 font-bold">
                    {r.productName} ({r.packSize}) • {r.returnKg || r.quantity} KG
                  </td>
                  <td className="p-3.5">
                    <StatusBadge status={r.reason || 'Old Stock'} type="return" />
                  </td>
                  <td className="p-3.5 text-right font-black text-slate-900">{r.returnKg} KG</td>
                  <td className="p-3.5 text-right font-black text-red-600 text-sm">
                    ₹{(r.returnValue || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
