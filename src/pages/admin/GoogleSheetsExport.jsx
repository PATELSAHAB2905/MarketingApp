import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { FileSpreadsheet, Download, RefreshCw, CheckCircle2, Link } from 'lucide-react';
import { convertToCSV, downloadCSV, syncToGoogleSheetsWebhook } from '../../services/sheetsSync';

export default function GoogleSheetsExport() {
  const {
    marketers,
    markets,
    weeklyRoutes,
    shops,
    visits,
    orders,
    collections,
    returns,
    followups,
    marketFeedbacks,
    dailyReports,
    googleSheetsWebhookUrl,
    setGoogleSheetsWebhookUrl,
  } = useData();

  const [activeTab, setActiveTab] = useState('orders');
  const [webhookUrlInput, setWebhookUrlInput] = useState(googleSheetsWebhookUrl);
  const [syncing, setSyncing] = useState(false);

  const tablesList = [
    { id: 'marketers', name: '1. Marketers Master', data: marketers },
    { id: 'markets', name: '2. Markets Master', data: markets },
    { id: 'routes', name: '3. Weekly Routes', data: weeklyRoutes },
    { id: 'shops', name: '4. Shops Master', data: shops },
    { id: 'visits', name: '5. Daily Visits', data: visits },
    { id: 'orders', name: '6. Orders', data: orders },
    { id: 'collections', name: '7. Payment Collections', data: collections },
    { id: 'returns', name: '8. Stock Returns', data: returns },
    { id: 'followups', name: '9. Follow-ups', data: followups },
    { id: 'feedbacks', name: '10. Market Feedback', data: marketFeedbacks },
    { id: 'daily_summary', name: '11. Daily Summary', data: dailyReports },
  ];

  const currentTable = tablesList.find((t) => t.id === activeTab) || tablesList[0];

  const handleExportCSV = (tableObj) => {
    const csv = convertToCSV(tableObj.data);
    downloadCSV(`Patel_Sahab_${tableObj.id}.csv`, csv);
  };

  const handleSaveWebhook = (e) => {
    e.preventDefault();
    setGoogleSheetsWebhookUrl(webhookUrlInput);
    localStorage.setItem('PATEL_SHEETS_WEBHOOK', webhookUrlInput);
    alert('Google Sheets Webhook URL Saved ✓');
  };

  const handleLiveWebhookSync = async () => {
    if (!webhookUrlInput) {
      alert('Please configure Google Sheets Webhook URL first');
      return;
    }
    setSyncing(true);
    const res = await syncToGoogleSheetsWebhook(webhookUrlInput, currentTable.id, currentTable.data);
    setSyncing(false);
    alert(res.message);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">GOOGLE SHEETS & RAW DATA EXPORT</h1>
          <p className="text-xs text-slate-500 font-medium">Export all 15 transaction tables to CSV or sync with Google Sheets</p>
        </div>
        <button
          onClick={() => handleExportCSV(currentTable)}
          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-md"
        >
          <Download className="w-4 h-4" />
          EXPORT ACTIVE TABLE TO CSV
        </button>
      </div>

      {/* Webhook Configuration */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <h2 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
          <Link className="w-4 h-4 text-emerald-600" />
          GOOGLE SHEETS WEBHOOK ENDPOINT CONFIGURATION
        </h2>
        <form onSubmit={handleSaveWebhook} className="flex gap-2 text-xs">
          <input
            type="url"
            value={webhookUrlInput}
            onChange={(e) => setWebhookUrlInput(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-mono text-xs"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl"
          >
            Save Webhook
          </button>
          <button
            type="button"
            onClick={handleLiveWebhookSync}
            disabled={syncing}
            className="px-4 py-2.5 bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync Now
          </button>
        </form>
      </div>

      {/* Tabs list */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {tablesList.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === t.id
                ? 'bg-slate-900 text-amber-300 shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {t.name} ({t.data?.length || 0})
          </button>
        ))}
      </div>

      {/* Active Table Preview */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
          <span className="font-black text-slate-900 uppercase">{currentTable.name} ({currentTable.data?.length || 0} Records)</span>
          <span className="text-slate-500">Live Structured Data Preview</span>
        </div>

        <div className="overflow-x-auto max-h-96">
          {currentTable.data && currentTable.data.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  {Object.keys(currentTable.data[0]).map((col) => (
                    <th key={col} className="p-3 border-b border-slate-800">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {currentTable.data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {Object.keys(row).map((col) => (
                      <td key={col} className="p-3 whitespace-nowrap max-w-xs truncate">
                        {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-400 font-bold">No records in this collection yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
