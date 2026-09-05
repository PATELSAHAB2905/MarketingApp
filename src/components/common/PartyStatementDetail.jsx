import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import {
  calculatePartyLedger,
  getDatePresetRange,
  formatIsoToDisplay,
} from '../../utils/partyLedgerHelper';
import {
  Store,
  Phone,
  MapPin,
  Calendar,
  IndianRupee,
  ShoppingBag,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  Share2,
  Plus,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  Eye,
  AlertCircle,
  Search,
  UserCheck,
} from 'lucide-react';

export default function PartyStatementDetail({
  shop: initialShop,
  onBack,
  onOpenOrder,
  onOpenCollection,
  onOpenReturn,
}) {
  const { currentUser } = useAuth();
  const { shops, orders, collections, returns, marketers, markets, marketRoutes } = useData();

  // Current active shop (allows switching party directly in view)
  const [currentShopId, setCurrentShopId] = useState(initialShop.id);
  const shop = useMemo(() => {
    return shops.find((s) => s.id === currentShopId) || initialShop;
  }, [shops, currentShopId, initialShop]);

  // View Mode: 'vyapar' | 'accounting'
  const [viewMode, setViewMode] = useState('vyapar');

  // Date Range Presets
  const [selectedPreset, setSelectedPreset] = useState('custom');
  const [fromDate, setFromDate] = useState('2023-08-01');
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  // Selected Transaction Modal State
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [partySearchOpen, setPartySearchOpen] = useState(false);
  const [partyQuery, setPartyQuery] = useState('');

  // Handle Preset change
  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset);
    const range = getDatePresetRange(preset);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  };

  // Compute live running ledger using helper
  const ledgerData = useMemo(() => {
    return calculatePartyLedger({
      shop,
      orders,
      collections,
      returns,
      fromDateIso: fromDate,
      toDateIso: toDate,
    });
  }, [shop, orders, collections, returns, fromDate, toDate]);

  // Find assigned marketer name
  const assignedMarketer = useMemo(() => {
    if (shop.assignedMarketerId) {
      const m = marketers.find((m) => m.id === shop.assignedMarketerId);
      if (m) return m.name;
    }
    if (shop.marketerName) return shop.marketerName;
    return 'Field Marketer';
  }, [shop, marketers]);

  // Vyapar-Formatted Transactions
  const vyaparTransactions = useMemo(() => {
    return ledgerData.periodTransactions.map((txn) => {
      const isSale = txn.type === 'SALE';
      const isPayment = txn.type === 'PAYMENT';
      const isReturn = txn.type === 'RETURN';

      let txnTypeDisplay = 'Sale';
      if (isPayment) txnTypeDisplay = 'Payment-In';
      if (isReturn) txnTypeDisplay = 'Sales Return';

      let paymentType = '—';
      if (isPayment) paymentType = txn.paymentMode || 'Cash';

      let paymentStatus = 'Unpaid';
      let totalAmount = txn.debit || txn.amount;
      let receivedAmount = 0;
      let txnBalance = txn.debit || txn.amount;

      if (isPayment) {
        paymentStatus = 'Used';
        totalAmount = txn.credit || txn.amount;
        receivedAmount = txn.credit || txn.amount;
        txnBalance = 0;
      } else if (isReturn) {
        paymentStatus = 'Adjusted';
        totalAmount = txn.credit || txn.amount;
        receivedAmount = txn.credit || txn.amount;
        txnBalance = 0;
      } else {
        // Sale: check if there's any immediate collection linked
        if (txn.raw?.paidAmount && txn.raw.paidAmount > 0) {
          receivedAmount = txn.raw.paidAmount;
          txnBalance = Math.max(0, totalAmount - receivedAmount);
          paymentStatus = txnBalance === 0 ? 'Paid' : 'Partial';
        } else {
          paymentStatus = 'Unpaid';
        }
      }

      return {
        ...txn,
        txnTypeDisplay,
        paymentType,
        paymentStatus,
        totalAmount,
        receivedAmount,
        txnBalance,
      };
    });
  }, [ledgerData]);

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    try {
      const headerRows = [
        ['PATEL SAHAB SPICES - PARTY STATEMENT REPORT'],
        [`Party Name: ${shop.name}`, `Owner: ${shop.owner || '—'}`, `Mobile: ${shop.mobile || '—'}`],
        [`Market: ${shop.marketName || '—'}`, `Route: ${shop.routeId || '—'}`, `Marketer: ${assignedMarketer}`],
        [`Statement Period: ${formatIsoToDisplay(fromDate)} To ${formatIsoToDisplay(toDate)}`],
        [],
        ['SUMMARY:'],
        ['Total Sale (Sale - Sale Return)', ledgerData.totalSales - ledgerData.totalReturns],
        ['Total Money-In (Collections)', ledgerData.totalCollections],
        ['Total Purchase', 0],
        ['Total Money-Out', 0],
        ['Total Expense', 0],
        ['Total Receivable (Net Outstanding)', ledgerData.closingBalance],
        [],
        ['TRANSACTIONS:'],
        ['DATE', 'TXN TYPE', 'REF NO.', 'PAYMENT TYPE', 'PAYMENT STATUS', 'TOTAL (₹)', 'RECEIVED / PAID (₹)', 'TXN BALANCE (₹)', 'RECEIVABLE BALANCE (₹)'],
        ['—', 'OPENING BALANCE', '—', '—', '—', '', '', '', ledgerData.openingBalance],
      ];

      const txnRows = vyaparTransactions.map((t) => [
        t.date,
        t.txnTypeDisplay,
        t.refNo,
        t.paymentType,
        t.paymentStatus,
        t.totalAmount,
        t.receivedAmount > 0 ? t.receivedAmount : 0,
        t.txnBalance,
        t.runningBalance,
      ]);

      const closingRow = [
        '—',
        'CLOSING TOTAL RECEIVABLE',
        '—',
        '—',
        '—',
        '',
        '',
        '',
        ledgerData.closingBalance,
      ];

      const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...txnRows, closingRow]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Party Statement');
      XLSX.writeFile(wb, `${shop.name.replace(/[^a-zA-Z0-9]/g, '_')}_Party_Statement.xlsx`);
    } catch (err) {
      alert('Failed to export Excel: ' + err.message);
    }
  };

  // WhatsApp Share Handler
  const handleShare = () => {
    const summaryText = `*PATEL SAHAB SPICES - PARTY STATEMENT*
*Party:* ${shop.name}
*Period:* ${formatIsoToDisplay(fromDate)} To ${formatIsoToDisplay(toDate)}

• *Total Sale:* ₹${(ledgerData.totalSales - ledgerData.totalReturns).toLocaleString('en-IN')}
• *Total Money-In (Paid):* ₹${ledgerData.totalCollections.toLocaleString('en-IN')}
• *Total Returns:* ₹${ledgerData.totalReturns.toLocaleString('en-IN')}
--------------------------------
*TOTAL RECEIVABLE (NET OUTSTANDING): ₹${ledgerData.closingBalance.toLocaleString('en-IN')}*

Thank you for your business!`;

    if (navigator.share) {
      navigator.share({ title: `${shop.name} Statement`, text: summaryText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(summaryText);
      alert('Statement summary copied to clipboard! You can paste and share on WhatsApp.');
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-2 sm:p-5 print:p-0 print:m-0">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP VYAPAR HEADER & TOOLBAR (Matching Screenshot)          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          {/* Back & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              Party Statement
            </h1>
          </div>

          {/* Top-Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {onOpenOrder && (
              <button
                onClick={() => onOpenOrder(shop)}
                className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Sale</span>
              </button>
            )}

            {onOpenCollection && (
              <button
                onClick={() => onOpenCollection(shop)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Payment-In</span>
              </button>
            )}

            <button
              onClick={handleShare}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Share With Accountant</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1"
              title="Excel Report"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Excel Report</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1"
              title="Print"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Filters Row (Date Range, Party Dropdown, View Toggle) */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Presets Dropdown */}
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetSelect(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-800 outline-none"
            >
              <option value="custom">Custom</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="prev_month">Previous Month</option>
              <option value="all_time">All Time</option>
            </select>

            {/* Between [From] To [To] */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 font-medium text-slate-700">
              <span className="font-bold text-slate-500">Between</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setSelectedPreset('custom');
                }}
                className="bg-white border border-slate-200 rounded px-1.5 py-0.5 font-bold text-slate-800 text-xs"
              />
              <span className="font-bold text-slate-500">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setSelectedPreset('custom');
                }}
                className="bg-white border border-slate-200 rounded px-1.5 py-0.5 font-bold text-slate-800 text-xs"
              />
            </div>

            {/* Party Selector Dropdown (e.g. Tirupati Kirana Store Kalapipal) */}
            <div className="relative">
              <select
                value={shop.id}
                onChange={(e) => setCurrentShopId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-black text-slate-900 outline-none max-w-xs truncate"
              >
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.connectedMarketName || s.marketName || 'Pachore'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* View Radio Toggle: (o) Vyapar  ( ) Accounting */}
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold">
            <span className="text-slate-500">View :</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-800">
              <input
                type="radio"
                name="viewMode"
                value="vyapar"
                checked={viewMode === 'vyapar'}
                onChange={() => setViewMode('vyapar')}
                className="text-red-600 focus:ring-red-500"
              />
              <span>Vyapar</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-800">
              <input
                type="radio"
                name="viewMode"
                value="accounting"
                checked={viewMode === 'accounting'}
                onChange={() => setViewMode('accounting')}
                className="text-red-600 focus:ring-red-500"
              />
              <span>Accounting</span>
            </label>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. PRINT / EXPORT BRANDING HEADER (Shown in Print)            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4">
        <h1 className="text-2xl font-black uppercase text-slate-900">PATEL SAHAB SPICES</h1>
        <h2 className="text-base font-bold text-slate-700">PARTY STATEMENT REPORT</h2>
        <div className="grid grid-cols-2 gap-2 text-xs mt-2">
          <p>Party Name: <strong>{shop.name}</strong></p>
          <p>Owner: <strong>{shop.owner || '—'}</strong></p>
          <p>Mobile: <strong>{shop.mobile || '—'}</strong></p>
          <p>Market / Route: <strong>{shop.connectedMarketName || shop.marketName || '—'} ({shop.routeId || '—'})</strong></p>
          <p>Period: <strong>{formatIsoToDisplay(fromDate)} To {formatIsoToDisplay(toDate)}</strong></p>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. VYAPAR TRANSACTION TABLE                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {viewMode === 'vyapar' ? (
            /* VYAPAR VIEW TABLE (Matching Screenshot) */
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">DATE</th>
                  <th className="p-3">TXN TYPE</th>
                  <th className="p-3">REF NO.</th>
                  <th className="p-3">PAYMENT TYPE</th>
                  <th className="p-3">PAYMENT STATUS</th>
                  <th className="p-3 text-right">TOTAL</th>
                  <th className="p-3 text-right">RECEIVED / PAID</th>
                  <th className="p-3 text-right">TXN BALANCE</th>
                  <th className="p-3 text-right">RECEIVABLE BALANCE</th>
                  <th className="p-3 text-center print:hidden">PRINT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {/* Opening Balance Row */}
                <tr className="bg-slate-50 font-bold text-slate-800">
                  <td className="p-3 text-slate-400">—</td>
                  <td className="p-3 font-black text-slate-900">Opening Balance</td>
                  <td className="p-3 text-slate-400 font-mono">—</td>
                  <td className="p-3 text-slate-400">—</td>
                  <td className="p-3 text-slate-400">—</td>
                  <td className="p-3 text-right">—</td>
                  <td className="p-3 text-right">—</td>
                  <td className="p-3 text-right">—</td>
                  <td className="p-3 text-right font-black text-slate-900">
                    ₹ {ledgerData.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-center print:hidden">—</td>
                </tr>

                {/* Period Transactions */}
                {vyaparTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-10 text-center text-slate-400 font-bold">
                      No transactions recorded in this period.
                    </td>
                  </tr>
                ) : (
                  vyaparTransactions.map((txn, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setSelectedTxn(txn)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer text-slate-800"
                    >
                      <td className="p-3 font-semibold text-slate-700">{txn.date}</td>
                      <td className="p-3 font-bold">
                        <span
                          className={
                            txn.txnTypeDisplay === 'Sale'
                              ? 'text-slate-900'
                              : txn.txnTypeDisplay === 'Payment-In'
                              ? 'text-emerald-700'
                              : 'text-blue-700'
                          }
                        >
                          {txn.txnTypeDisplay}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-600">{txn.refNo}</td>
                      <td className="p-3">{txn.paymentType}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            txn.paymentStatus === 'Used' || txn.paymentStatus === 'Paid'
                              ? 'text-emerald-700 bg-emerald-50'
                              : txn.paymentStatus === 'Partial'
                              ? 'text-blue-700 bg-blue-50'
                              : 'text-red-700 bg-red-50'
                          }`}
                        >
                          {txn.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold">
                        ₹ {txn.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-700">
                        ₹ {txn.receivedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-800">
                        ₹ {txn.txnBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-black text-slate-900 text-sm">
                        ₹ {txn.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center print:hidden">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTxn(txn);
                          }}
                          className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800"
                        >
                          <Printer className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* ACCOUNTING VIEW TABLE (Debit / Credit) */
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">DATE</th>
                  <th className="p-3">PARTICULARS</th>
                  <th className="p-3">REF NO.</th>
                  <th className="p-3 text-right">DEBIT (SALE ₹)</th>
                  <th className="p-3 text-right">CREDIT (PAYMENT/RETURN ₹)</th>
                  <th className="p-3 text-right">RUNNING BALANCE</th>
                  <th className="p-3 text-center print:hidden">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr className="bg-slate-50 font-bold text-slate-800">
                  <td className="p-3 text-slate-400">—</td>
                  <td className="p-3 font-black text-slate-900">OPENING BALANCE</td>
                  <td className="p-3 text-slate-400 font-mono">B/F</td>
                  <td className="p-3 text-right">—</td>
                  <td className="p-3 text-right">—</td>
                  <td className="p-3 text-right font-black text-slate-900">
                    ₹ {ledgerData.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-center print:hidden">—</td>
                </tr>

                {ledgerData.periodTransactions.map((txn, idx) => (
                  <tr
                    key={idx}
                    onClick={() => setSelectedTxn(txn)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="p-3 font-semibold text-slate-700">{txn.date}</td>
                    <td className="p-3 font-bold text-slate-800">{txn.particular}</td>
                    <td className="p-3 font-mono font-bold text-slate-600">{txn.refNo}</td>
                    <td className="p-3 text-right font-black text-red-700">
                      {txn.debit > 0 ? `₹ ${txn.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-700">
                      {txn.credit > 0 ? `₹ ${txn.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="p-3 text-right font-black text-slate-900 text-sm">
                      ₹ {txn.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center print:hidden">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTxn(txn);
                        }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800"
                      >
                        <Eye className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 4. BOTTOM "PARTY STATEMENT SUMMARY" (Matching Screenshot)     */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Left Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs">
              <div>
                <span className="text-slate-700 font-bold">Total Sale: </span>
                <strong className="text-slate-950 font-black">
                  ₹ {(ledgerData.totalSales - ledgerData.totalReturns).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
                <span className="block text-[10px] text-slate-400 font-medium">(Sale - Sale Return)</span>
              </div>

              <div>
                <span className="text-slate-700 font-bold">Total Purchase: </span>
                <strong className="text-slate-950 font-black">₹ 0.00</strong>
                <span className="block text-[10px] text-slate-400 font-medium">(Purchase - Purchase Return)</span>
              </div>

              <div>
                <span className="text-slate-700 font-bold">Total Expense: </span>
                <strong className="text-slate-950 font-black">₹ 0.00</strong>
              </div>

              <div>
                <span className="text-slate-700 font-bold">Total Money-In: </span>
                <strong className="text-emerald-700 font-black">
                  ₹ {ledgerData.totalCollections.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>

              <div>
                <span className="text-slate-700 font-bold">Total Money-out: </span>
                <strong className="text-slate-950 font-black">₹ 0.00</strong>
              </div>
            </div>

            {/* Right Side Large Highlight: Total Receivable */}
            <div className="text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-slate-200 w-full md:w-auto">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 block">
                Total Receivable
              </span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 block mt-0.5">
                ₹ {ledgerData.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. TRANSACTION DETAIL VOUCHER MODAL                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  TRANSACTION VOUCHER DETAILS
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  {selectedTxn.particular}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Voucher Metadata */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px]">Date:</span>
                <strong className="text-slate-800">{selectedTxn.date}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Reference / Voucher #:</span>
                <strong className="text-slate-800 font-mono">{selectedTxn.refNo}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Amount:</span>
                <strong className="text-emerald-700 text-sm">
                  ₹ {(selectedTxn.totalAmount || selectedTxn.amount || selectedTxn.debit || selectedTxn.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Party Name:</span>
                <strong className="text-slate-800">{shop.name}</strong>
              </div>
            </div>

            {/* If Order / Sale Details */}
            {selectedTxn.type === 'SALE' && selectedTxn.raw?.items && (
              <div className="space-y-2 text-xs">
                <p className="font-bold text-slate-700 uppercase text-[10px]">ORDERED ITEMS BREAKDOWN:</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[9px]">
                      <tr>
                        <th className="p-2">Item</th>
                        <th className="p-2 text-right">Qty (KG)</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedTxn.raw.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-bold text-slate-800">
                            {it.productName} {it.packSize && `(${it.packSize})`}
                          </td>
                          <td className="p-2 text-right font-bold">
                            {it.quantityKg ? `${it.quantityKg} KG` : (it.quantityPouch ? `${it.quantityPouch} Pouches` : `${it.quantity || 1} KG`)}
                          </td>
                          <td className="p-2 text-right font-bold text-emerald-700">₹{it.pricePerKg || it.sellingPrice}</td>
                          <td className="p-2 text-right font-black text-slate-900">₹{it.subtotal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* If Payment Collection Details */}
            {selectedTxn.type === 'PAYMENT' && (
              <div className="space-y-2 text-xs">
                <p className="font-bold text-slate-700 uppercase text-[10px]">PAYMENT COLLECTION DETAILS:</p>
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 space-y-1">
                  <p>Mode: <strong>{selectedTxn.raw?.paymentMode || 'Cash'}</strong></p>
                  {selectedTxn.raw?.remark && <p>Note: {selectedTxn.raw.remark}</p>}
                  {selectedTxn.slipUrl && (
                    <div className="mt-2 pt-2 border-t border-emerald-200">
                      <span className="text-[10px] text-emerald-800 font-bold block mb-1">Physical Slip Photo:</span>
                      <img
                        src={selectedTxn.slipUrl}
                        alt="Collection Slip"
                        className="max-h-48 rounded-xl border border-emerald-300 object-contain mx-auto"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* If Sales Return / Credit Note */}
            {selectedTxn.type === 'RETURN' && (
              <div className="space-y-2 text-xs">
                <p className="font-bold text-slate-700 uppercase text-[10px]">RETURN / CREDIT NOTE DETAILS:</p>
                <div className="bg-red-50/50 border border-red-200 rounded-xl p-3 space-y-1">
                  <p>Product: <strong>{selectedTxn.raw?.productName || 'Goods'}</strong></p>
                  <p>Quantity: <strong>{selectedTxn.raw?.quantityKg || 1} KG</strong></p>
                  <p>Reason: {selectedTxn.raw?.reason || 'Damage/Expiries'}</p>
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedTxn(null)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs"
            >
              Close Voucher
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
