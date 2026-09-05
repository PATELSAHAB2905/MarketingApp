import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { BarChart, Filter, Calendar, TrendingUp, IndianRupee, RotateCcw, Store, Download } from 'lucide-react';
import { convertToCSV, downloadCSV } from '../../services/sheetsSync';

export default function PerformanceReports() {
  const { dailyReports, markets, marketers } = useData();

  const [selectedMonth, setSelectedMonth] = useState('August 2026');
  const [selectedMarket, setSelectedMarket] = useState('ALL');
  const [selectedMarketer, setSelectedMarketer] = useState('ALL');

  const filteredReports = dailyReports.filter((r) => {
    if (selectedMarket !== 'ALL' && r.marketId !== selectedMarket) return false;
    if (selectedMarketer !== 'ALL' && r.marketerId !== selectedMarketer) return false;
    return true;
  });

  const totalKg = filteredReports.reduce((s, r) => s + (r.salesKg || 0), 0);
  const totalVal = filteredReports.reduce((s, r) => s + (r.salesValue || 0), 0);
  const totalColl = filteredReports.reduce((s, r) => s + (r.collectionValue || 0), 0);
  const totalRet = filteredReports.reduce((s, r) => s + (r.returnsValue || 0), 0);

  const handleExportReport = () => {
    const csv = convertToCSV(filteredReports);
    downloadCSV(`Patel_Sahab_Performance_Report_${selectedMonth.replace(' ', '_')}.csv`, csv);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">PERFORMANCE REPORTS & ANALYTICS</h1>
          <p className="text-xs text-slate-500 font-medium">Historical sales growth, market ranking, and collection analysis</p>
        </div>
        <button
          onClick={handleExportReport}
          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-md"
        >
          <Download className="w-4 h-4" />
          EXPORT CSV REPORT
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold">
        <div>
          <label className="text-slate-500 uppercase block mb-1">Select Month / Date Range</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
          >
            <option value="August 2026">August 2026 (Current Month)</option>
            <option value="July 2026">July 2026 (Previous Month)</option>
          </select>
        </div>

        <div>
          <label className="text-slate-500 uppercase block mb-1">Filter Market</label>
          <select
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
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
          <label className="text-slate-500 uppercase block mb-1">Filter Marketer</label>
          <select
            value={selectedMarketer}
            onChange={(e) => setSelectedMarketer(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
          >
            <option value="ALL">All Marketers</option>
            {marketers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Performance Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-900 text-white p-6 rounded-3xl grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold">Total Sales Weight</span>
          <p className="text-3xl font-black text-amber-300 mt-0.5">{totalKg} KG</p>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold">Total Sales Value</span>
          <p className="text-3xl font-black text-white mt-0.5">₹{totalVal.toLocaleString('en-IN')}</p>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold">Total Collection</span>
          <p className="text-3xl font-black text-emerald-400 mt-0.5">₹{totalColl.toLocaleString('en-IN')}</p>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold">Total Stock Returns</span>
          <p className="text-3xl font-black text-red-400 mt-0.5">₹{totalRet.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Historical Report Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-amber-300 uppercase text-[10px] font-bold">
            <tr>
              <th className="p-3.5">Date</th>
              <th className="p-3.5">Market</th>
              <th className="p-3.5">Marketer</th>
              <th className="p-3.5 text-right">Shops Visited</th>
              <th className="p-3.5 text-right">Sales KG</th>
              <th className="p-3.5 text-right">Sales Value</th>
              <th className="p-3.5 text-right">Collection</th>
              <th className="p-3.5 text-right">Returns</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredReports.map((r, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="p-3.5 font-extrabold text-slate-900">{r.date}</td>
                <td className="p-3.5 font-bold uppercase text-amber-800">{r.marketName}</td>
                <td className="p-3.5 text-slate-700 font-semibold">{r.marketerName}</td>
                <td className="p-3.5 text-right font-bold text-slate-800">{r.shopsVisited}</td>
                <td className="p-3.5 text-right font-black text-slate-900">{r.salesKg} KG</td>
                <td className="p-3.5 text-right font-bold text-slate-900">₹{(r.salesValue || 0).toLocaleString('en-IN')}</td>
                <td className="p-3.5 text-right font-black text-emerald-700">₹{(r.collectionValue || 0).toLocaleString('en-IN')}</td>
                <td className="p-3.5 text-right font-bold text-red-600">₹{(r.returnsValue || 0).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
