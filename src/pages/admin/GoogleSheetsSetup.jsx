import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  FileSpreadsheet, Link, Check, X, RefreshCw, AlertTriangle,
  CheckCircle2, Clock, Wifi, WifiOff, Copy, ExternalLink,
  ChevronDown, ChevronUp, Download,
} from 'lucide-react';
import {
  APPS_SCRIPT_CODE,
  getSheetsWebhookUrl,
  saveSheetsWebhookUrl,
  testSheetsConnection,
  syncOrderToSheets,
} from '../../services/sheetsService';

// Sync status badge helper
const SyncBadge = ({ status }) => {
  const map = {
    pending:   { cls: 'bg-amber-100 text-amber-800',   label: 'PENDING' },
    synced:    { cls: 'bg-emerald-100 text-emerald-800', label: 'SYNCED ✓' },
    duplicate: { cls: 'bg-blue-100 text-blue-800',      label: 'DUPLICATE ✓' },
    failed:    { cls: 'bg-red-100 text-red-800',         label: 'FAILED ✗' },
    no_webhook:{ cls: 'bg-slate-100 text-slate-600',    label: 'NO WEBHOOK' },
  };
  const { cls, label } = map[status] || map.pending;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${cls}`}>
      {label}
    </span>
  );
};

const TARGET_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1sXatXq4ty_kR_4JIT5tZKMt99m9RCGAB9_KkJeWR0yk/edit';

export default function GoogleSheetsSetup() {
  const { orders, marketers, updateOrderSyncStatus } = useData();

  const [webhookUrl, setWebhookUrl] = useState(getSheetsWebhookUrl);
  const [webhookInput, setWebhookInput] = useState(getSheetsWebhookUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showScript, setShowScript] = useState(false);
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryLog, setRetryLog] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');

  const pendingOrFailed = orders.filter(o => o.syncStatus === 'pending' || o.syncStatus === 'failed');
  const filteredOrders = filterStatus === 'all'
    ? orders
    : orders.filter(o => o.syncStatus === filterStatus);

  const handleSaveWebhook = (e) => {
    e.preventDefault();
    saveSheetsWebhookUrl(webhookInput.trim());
    setWebhookUrl(webhookInput.trim());
    setTestResult({ success: true, message: '✓ Webhook URL saved.' });
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testSheetsConnection(webhookInput.trim());
    setTesting(false);
    setTestResult(result);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleRetryAll = async () => {
    if (!webhookUrl) {
      alert('Please save the Webhook URL first.');
      return;
    }
    setRetrying(true);
    setRetryLog([]);
    const toRetry = orders.filter(o => o.syncStatus === 'pending' || o.syncStatus === 'failed');

    for (const order of toRetry) {
      const marketer = marketers.find(m => m.id === order.marketerId);
      const marketerName = marketer?.name || order.marketerName || 'Unknown';
      setRetryLog(prev => [...prev, { id: order.id, status: 'retrying', message: `Syncing ${order.id}...` }]);
      const result = await syncOrderToSheets(order, marketerName, webhookUrl);
      updateOrderSyncStatus(order.id, result.status, result.message);
      setRetryLog(prev => prev.map(r =>
        r.id === order.id
          ? { ...r, status: result.status, message: result.message }
          : r
      ));
    }
    setRetrying(false);
  };

  const handleRetrySingle = async (order) => {
    if (!webhookUrl) { alert('Please save the Webhook URL first.'); return; }
    const marketer = marketers.find(m => m.id === order.marketerId);
    const marketerName = marketer?.name || order.marketerName || 'Unknown';
    updateOrderSyncStatus(order.id, 'pending', 'Retrying...');
    const result = await syncOrderToSheets(order, marketerName, webhookUrl);
    updateOrderSyncStatus(order.id, result.status, result.message);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-700" />
            GOOGLE SHEETS SETUP
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Configure real-time sync of orders to Google Sheets — one tab per marketer
          </p>
        </div>
        <a
          href={TARGET_SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-xs flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Open Google Sheet
        </a>
      </div>

      {/* ===== STEP 1: APPS SCRIPT SETUP ===== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div
          className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setShowScript(s => !s)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm">1</div>
            <div>
              <h2 className="font-black text-slate-900 text-base">Deploy Google Apps Script (One-Time Setup)</h2>
              <p className="text-xs text-slate-500">Copy-paste the script into Google Sheets → Extensions → Apps Script</p>
            </div>
          </div>
          {showScript ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>

        {showScript && (
          <div className="border-t border-slate-100 p-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
              <p className="font-black">📌 Step-by-Step Instructions (Minimum Permissions Scope):</p>
              <ol className="list-decimal pl-4 space-y-1 text-amber-800">
                <li>Open your target <a href={TARGET_SHEET_URL} target="_blank" rel="noopener noreferrer" className="underline font-bold">Patel Sahab Spices Google Sheet</a></li>
                <li>Click <strong>Extensions → Apps Script</strong></li>
                <li>Delete any existing code in the editor</li>
                <li>Paste the code below (includes <code>@OnlyCurrentDoc</code> to restrict access <strong>ONLY to this spreadsheet</strong>)</li>
                <li>Click <strong>Save</strong> (Ctrl+S)</li>
                <li>Click <strong>Deploy → New Deployment</strong></li>
                <li>Click the Gear icon ⚙️ next to 'Select type' → choose <strong>Web App</strong></li>
                <li>Description: <code>Patel Sahab Spices Order Sync</code></li>
                <li>Execute as: <strong>Me</strong></li>
                <li>Who has access: <strong>Anyone</strong></li>
                <li>Click <strong>Deploy</strong> → Authorize access (Google will confirm access is ONLY for this single document)</li>
                <li>Copy the Web App URL and paste it in Step 2 below</li>
              </ol>
              <div className="mt-2 pt-2 border-t border-amber-200/60 text-[11px] text-emerald-900 font-semibold flex items-center gap-1">
                <span>🛡️ <strong>Security Protected:</strong> With <code>@OnlyCurrentDoc</code>, Google only grants access to this single spreadsheet (<code>spreadsheets.currentonly</code>). No other files or sheets in your Google Drive can be accessed.</span>
              </div>
            </div>

            <div className="relative">
              <pre className="bg-slate-900 text-emerald-300 text-[10px] font-mono p-4 rounded-2xl overflow-x-auto max-h-64 overflow-y-auto leading-relaxed whitespace-pre">
                {APPS_SCRIPT_CODE.trim()}
              </pre>
              <button
                onClick={handleCopyScript}
                className={`absolute top-3 right-3 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all ${
                  copied ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                }`}
              >
                {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Code</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== STEP 2: WEBHOOK URL ===== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm">2</div>
          <div>
            <h2 className="font-black text-slate-900 text-base">Configure Webhook URL</h2>
            <p className="text-xs text-slate-500">Paste the Apps Script Web App URL here</p>
          </div>
        </div>

        <form onSubmit={handleSaveWebhook} className="space-y-3">
          <input
            type="url"
            value={webhookInput}
            onChange={e => setWebhookInput(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfycbxxxxxxx.../exec"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs"
            >
              Save Webhook URL
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !webhookInput}
              className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
              Test Connection
            </button>
          </div>
        </form>

        {testResult && (
          <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
            testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {testResult.message}
          </div>
        )}

        {webhookUrl && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
            <span className="font-bold">✓ Active URL: </span>
            <span className="font-mono break-all">{webhookUrl.substring(0, 60)}...</span>
          </div>
        )}
      </div>

      {/* ===== STEP 3: MARKETER TABS INFO ===== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm">3</div>
          <div>
            <h2 className="font-black text-slate-900 text-base">Marketer Sheet Tabs</h2>
            <p className="text-xs text-slate-500">Each marketer gets their own tab — auto-created on first sync</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {['Deepak Prajapati', 'Vijay Verma', 'Atul Meena', 'Pankaj Malviya', 'Vikash Meena'].map(name => (
            <div key={name} className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
              {name}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400">
          Sheet format: Date | Order ID | Route | Shop Name | Product | Pack Size | Qty KG | Price/KG | Amount | Grand Total | Remarks
        </p>
      </div>

      {/* ===== SYNC QUEUE ===== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center flex-wrap gap-3">
          <div>
            <h2 className="font-black text-slate-900 text-base uppercase">Order Sync Queue</h2>
            <p className="text-xs text-slate-500">{pendingOrFailed.length} orders pending / failed sync</p>
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none"
            >
              <option value="all">All ({orders.length})</option>
              <option value="pending">Pending</option>
              <option value="synced">Synced</option>
              <option value="duplicate">Duplicate</option>
              <option value="failed">Failed</option>
            </select>
            {pendingOrFailed.length > 0 && (
              <button
                onClick={handleRetryAll}
                disabled={retrying || !webhookUrl}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {retrying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Retry All ({pendingOrFailed.length})
              </button>
            )}
          </div>
        </div>

        {/* Retry Log */}
        {retryLog.length > 0 && (
          <div className="bg-slate-50 p-4 border-b border-slate-100 space-y-1 max-h-32 overflow-y-auto">
            {retryLog.map(r => (
              <div key={r.id} className={`text-[10px] font-mono flex items-center gap-2 ${
                r.status === 'synced' ? 'text-emerald-700' :
                r.status === 'failed' ? 'text-red-700' :
                'text-amber-700'
              }`}>
                {r.status === 'retrying' ? <RefreshCw className="w-3 h-3 animate-spin" /> :
                 r.status === 'synced'   ? <Check className="w-3 h-3" /> :
                                           <X className="w-3 h-3" />}
                <strong>{r.id}</strong>: {r.message}
              </div>
            ))}
          </div>
        )}

        {/* Orders Table */}
        <div className="overflow-x-auto">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No orders found for this filter.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-900 text-amber-300 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3 text-left">Order ID</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Marketer</th>
                  <th className="p-3 text-left">Shop</th>
                  <th className="p-3 text-left">Route</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-center">Sync Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.slice(0, 100).map(order => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900 text-[10px]">{order.id}</td>
                    <td className="p-3 text-slate-600">{order.date || order.createdDate}</td>
                    <td className="p-3 font-semibold text-slate-800">{order.marketerName || '—'}</td>
                    <td className="p-3 text-slate-700 max-w-[150px] truncate">{order.shopName}</td>
                    <td className="p-3 text-slate-600">{order.routeName || order.marketName || '—'}</td>
                    <td className="p-3 text-right font-black text-slate-900">
                      ₹{(order.grandTotal || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center">
                      <SyncBadge status={order.syncStatus} />
                      {order.syncMessage && (
                        <p className="text-[9px] text-slate-400 mt-0.5 max-w-[120px] truncate mx-auto" title={order.syncMessage}>
                          {order.syncMessage}
                        </p>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {(order.syncStatus === 'pending' || order.syncStatus === 'failed') && (
                        <button
                          onClick={() => handleRetrySingle(order)}
                          disabled={!webhookUrl}
                          className="px-2 py-1 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-lg text-[10px] font-bold flex items-center gap-1 mx-auto disabled:opacity-50"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          Retry
                        </button>
                      )}
                      {(order.syncStatus === 'synced' || order.syncStatus === 'duplicate') && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Format Preview */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-3">
        <h2 className="font-black text-slate-900 text-sm uppercase">Google Sheet Format Preview</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] font-mono border border-slate-200">
            <thead className="bg-slate-900 text-amber-300">
              <tr>
                {['Date', 'Order ID', 'Route/Market', 'Shop Name', 'Product', 'Pack', 'KG', 'Price/KG', 'Amount', 'Grand Total', 'Remarks'].map(h => (
                  <th key={h} className="px-2 py-1.5 text-left font-bold border-r border-slate-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-white">
                <td className="px-2 py-1 border-r border-slate-200 font-bold">17-08-2026</td>
                <td className="px-2 py-1 border-r border-slate-200 font-bold text-red-700">ORD-17082026-0001</td>
                <td className="px-2 py-1 border-r border-slate-200">Pachore</td>
                <td className="px-2 py-1 border-r border-slate-200 font-bold">Sawariya Kirana Store</td>
                <td className="px-2 py-1 border-r border-slate-200">Mirchi Powder</td>
                <td className="px-2 py-1 border-r border-slate-200">500g</td>
                <td className="px-2 py-1 border-r border-slate-200">10</td>
                <td className="px-2 py-1 border-r border-slate-200">275</td>
                <td className="px-2 py-1 border-r border-slate-200">2750</td>
                <td className="px-2 py-1 border-r border-slate-200"></td>
                <td className="px-2 py-1"></td>
              </tr>
              <tr className="bg-white">
                <td className="px-2 py-1 border-r border-slate-200 text-slate-300">—</td>
                <td className="px-2 py-1 border-r border-slate-200 text-slate-300">—</td>
                <td className="px-2 py-1 border-r border-slate-200 text-slate-300">—</td>
                <td className="px-2 py-1 border-r border-slate-200 text-slate-300">—</td>
                <td className="px-2 py-1 border-r border-slate-200">Haldi Powder</td>
                <td className="px-2 py-1 border-r border-slate-200">100g</td>
                <td className="px-2 py-1 border-r border-slate-200">5</td>
                <td className="px-2 py-1 border-r border-slate-200">245</td>
                <td className="px-2 py-1 border-r border-slate-200">1225</td>
                <td className="px-2 py-1 border-r border-slate-200"></td>
                <td className="px-2 py-1"></td>
              </tr>
              <tr className="bg-white">
                <td className="px-2 py-1 border-r border-slate-200 text-slate-300">—</td>
                <td className="px-2 py-1 border-r border-slate-200 text-slate-300">—</td>
                <td className="px-2 py-1 border-r border-slate-200 text-slate-300">—</td>
                <td className="px-2 py-1 border-r border-slate-200 text-slate-300">—</td>
                <td className="px-2 py-1 border-r border-slate-200">Dhaniya Powder</td>
                <td className="px-2 py-1 border-r border-slate-200">200g</td>
                <td className="px-2 py-1 border-r border-slate-200">15</td>
                <td className="px-2 py-1 border-r border-slate-200">210</td>
                <td className="px-2 py-1 border-r border-slate-200">3150</td>
                <td className="px-2 py-1 border-r border-slate-200 font-black text-emerald-700">₹7,125</td>
                <td className="px-2 py-1"></td>
              </tr>
              <tr className="bg-slate-50">
                <td colSpan={11} className="px-2 py-1 text-slate-300 text-center">— blank separator row —</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-slate-400">
          Date · Order ID · Route · Shop appear only in the first product row. Grand Total appears in the last product row. A blank row separates each order.
        </p>
      </div>
    </div>
  );
}
