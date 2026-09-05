import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { FileSpreadsheet, Download, Printer, Filter, Calendar } from 'lucide-react';
import { convertToCSV, downloadCSV } from '../../services/sheetsSync';

export default function MdoReport() {
  const { dailyReports, marketers, markets } = useData();

  const [timeframe, setTimeframe] = useState('30-Day');
  const [selectedMarketer, setSelectedMarketer] = useState('ALL');
  const [selectedMarket, setSelectedMarket] = useState('ALL');

  // Multi-day report data generation
  const mdoRows = [
    {
      date: '18-08-2026',
      planMarket: 'Pachore',
      actualMarket: 'Pachore',
      routeType: 'Normal Fixed Route',
      marketerName: 'Deepak Sharma',
      totalCustomerConnected: 27,
      newCustomerConnected: 3,
      oldCustomerConnected: 24,
      leadCount: 5,
      customerAdded: 2,
      orderPlanKg: 130,
      orderActualKg: 118,
      achievementPct: 90.77,
      shortfallKg: 12,
      collectionPlan: 25000,
      collectionActual: 21500,
      dueAmount: 3500,
      returnKg: 8,
      returnValue: 2100,
      complaintCount: 2,
    },
    {
      date: '17-08-2026',
      planMarket: 'Pachore',
      actualMarket: 'Pachore',
      routeType: 'Normal Fixed Route',
      marketerName: 'Deepak Sharma',
      totalCustomerConnected: 28,
      newCustomerConnected: 2,
      oldCustomerConnected: 26,
      leadCount: 4,
      customerAdded: 1,
      orderPlanKg: 130,
      orderActualKg: 125,
      achievementPct: 96.15,
      shortfallKg: 5,
      collectionPlan: 25000,
      collectionActual: 24000,
      dueAmount: 1000,
      returnKg: 5,
      returnValue: 1200,
      complaintCount: 0,
    },
    {
      date: '16-08-2026',
      planMarket: 'Ashta',
      actualMarket: 'Pachore',
      routeType: 'Temporary Assignment (Sachin Absent)',
      marketerName: 'Pankaj Verma',
      totalCustomerConnected: 25,
      newCustomerConnected: 4,
      oldCustomerConnected: 21,
      leadCount: 6,
      customerAdded: 3,
      orderPlanKg: 120,
      orderActualKg: 115,
      achievementPct: 95.83,
      shortfallKg: 5,
      collectionPlan: 22000,
      collectionActual: 20000,
      dueAmount: 2000,
      returnKg: 10,
      returnValue: 2400,
      complaintCount: 1,
    },
    {
      date: '11-08-2026',
      planMarket: 'Pachore',
      actualMarket: 'Pachore',
      routeType: 'Normal Fixed Route',
      marketerName: 'Deepak Sharma',
      totalCustomerConnected: 28,
      newCustomerConnected: 2,
      oldCustomerConnected: 26,
      leadCount: 3,
      customerAdded: 2,
      orderPlanKg: 130,
      orderActualKg: 210,
      achievementPct: 161.54,
      shortfallKg: 0,
      collectionPlan: 25000,
      collectionActual: 32000,
      dueAmount: 0,
      returnKg: 12,
      returnValue: 2800,
      complaintCount: 1,
    },
  ];

  const filteredRows = mdoRows.filter((r) => {
    if (selectedMarket !== 'ALL' && r.actualMarket !== selectedMarket) return false;
    if (selectedMarketer !== 'ALL' && r.marketerName !== selectedMarketer) return false;
    return true;
  });

  const handleExportCSV = () => {
    const csv = convertToCSV(filteredRows);
    downloadCSV(`Patel_Sahab_MDO_30Day_Report_${timeframe}.csv`, csv);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">MDO / 30-DAY DAILY PERFORMANCE REPORT</h1>
          <p className="text-xs text-slate-500 font-medium">Replication of company's Excel MDO sheet (Plan vs Field Activity vs Actual Result)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-md"
          >
            <Download className="w-4 h-4" />
            EXPORT EXCEL / CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-900 text-white rounded-2xl font-extrabold text-xs flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            PRINT REPORT
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold">
        <div>
          <label className="text-slate-500 uppercase block mb-1">Timeframe View</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
          >
            <option value="Daily">Daily Report</option>
            <option value="Weekly">Weekly Report</option>
            <option value="Monthly">Monthly Report</option>
            <option value="30-Day">30-Day MDO Table</option>
            <option value="31-Day">31-Day MDO Table</option>
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
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
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
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 30-Day MDO Table (Section 4 & 19) */}
      <div id="printable-receipt" className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-amber-300 flex justify-between items-center text-xs">
          <span className="font-black uppercase tracking-wider">PATEL SAHAB SPICES • MDO 30-DAY PERFORMANCE MATRIX</span>
          <span className="text-slate-300 font-bold">{timeframe} View</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-800 text-white uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3 border border-slate-700">Date</th>
                <th className="p-3 border border-slate-700">Plan Market</th>
                <th className="p-3 border border-slate-700">Actual Market</th>
                <th className="p-3 border border-slate-700 text-center">Total Connected</th>
                <th className="p-3 border border-slate-700 text-center">New</th>
                <th className="p-3 border border-slate-700 text-center">Old</th>
                <th className="p-3 border border-slate-700 text-center">Leads</th>
                <th className="p-3 border border-slate-700 text-center">Customer Added</th>
                <th className="p-3 border border-slate-700 text-right">Order Plan</th>
                <th className="p-3 border border-slate-700 text-right">Order Actual</th>
                <th className="p-3 border border-slate-700 text-right">Collection Plan</th>
                <th className="p-3 border border-slate-700 text-right">Collection Actual</th>
                <th className="p-3 border border-slate-700 text-right">Due</th>
                <th className="p-3 border border-slate-700 text-right">Return ₹</th>
                <th className="p-3 border border-slate-700 text-center">Complaints</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {filteredRows.map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2.5 border border-slate-200 font-extrabold text-slate-900">{r.date}</td>
                  <td className="p-2.5 border border-slate-200 font-bold text-slate-700 uppercase">{r.planMarket}</td>
                  <td className="p-2.5 border border-slate-200 font-extrabold text-amber-900 uppercase">
                    {r.actualMarket}
                    {r.routeType.includes('Temporary') && (
                      <span className="block text-[9px] text-amber-700 font-bold">(Temp Override)</span>
                    )}
                  </td>
                  <td className="p-2.5 border border-slate-200 text-center font-black text-slate-900">{r.totalCustomerConnected}</td>
                  <td className="p-2.5 border border-slate-200 text-center font-bold text-blue-700">{r.newCustomerConnected}</td>
                  <td className="p-2.5 border border-slate-200 text-center font-bold text-slate-700">{r.oldCustomerConnected}</td>
                  <td className="p-2.5 border border-slate-200 text-center font-bold text-purple-700">{r.leadCount}</td>
                  <td className="p-2.5 border border-slate-200 text-center font-black text-emerald-700">{r.customerAdded}</td>
                  <td className="p-2.5 border border-slate-200 text-right font-bold text-slate-600">{r.orderPlanKg} KG</td>
                  <td className="p-2.5 border border-slate-200 text-right font-black text-slate-900">
                    {r.orderActualKg} KG
                    <span className="block text-[9px] text-emerald-600 font-bold">({r.achievementPct}%)</span>
                  </td>
                  <td className="p-2.5 border border-slate-200 text-right font-bold text-slate-600">₹{r.collectionPlan.toLocaleString('en-IN')}</td>
                  <td className="p-2.5 border border-slate-200 text-right font-black text-emerald-700">₹{r.collectionActual.toLocaleString('en-IN')}</td>
                  <td className="p-2.5 border border-slate-200 text-right font-bold text-red-600">₹{r.dueAmount.toLocaleString('en-IN')}</td>
                  <td className="p-2.5 border border-slate-200 text-right font-bold text-amber-700">₹{r.returnValue.toLocaleString('en-IN')}</td>
                  <td className="p-2.5 border border-slate-200 text-center font-bold text-red-700">{r.complaintCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
