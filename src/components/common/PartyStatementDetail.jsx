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
  Edit,
  Trash2,
} from 'lucide-react';

export default function PartyStatementDetail({
  shop: initialShop,
  onBack,
  onOpenOrder,
  onOpenCollection,
  onOpenReturn,
}) {
  const { currentUser } = useAuth();
  const { shops, orders, collections, returns, marketers, markets, marketRoutes, connectedMarkets, updateShop, deleteShop } = useData();

  // Current active shop (allows switching party directly in view)
  const [currentShopId, setCurrentShopId] = useState(initialShop.id);
  const shop = useMemo(() => {
    return shops.find((s) => s.id === currentShopId) || initialShop;
  }, [shops, currentShopId, initialShop]);

  // Edit Party state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editMarketId, setEditMarketId] = useState('');
  const [editRouteId, setEditRouteId] = useState('');
  const [editConnectedMarketId, setEditConnectedMarketId] = useState('');
  const [editStatus, setEditStatus] = useState('Customer');
  const [editOutstanding, setEditOutstanding] = useState('');

  // Delete Party state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTransactions, setDeleteTransactions] = useState(true);

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

  // Search & Type Filters
  const [txnSearchQuery, setTxnSearchQuery] = useState('');
  const [txnTypeFilter, setTxnTypeFilter] = useState('ALL'); // 'ALL' | 'SALE' | 'PAYMENT' | 'RETURN'
  const [sortOrder, setSortOrder] = useState('ASC'); // 'ASC' (Chronological) | 'DESC' (Newest first)

  // Selected Transaction Modal State
  const [selectedTxn, setSelectedTxn] = useState(null);

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

  // Vyapar-Formatted Transactions with filtering and sorting
  const vyaparTransactions = useMemo(() => {
    const formatted = ledgerData.periodTransactions.map((txn) => {
      const isSale = txn.type === 'SALE';
      const isPayment = txn.type === 'PAYMENT';
      const isReturn = txn.type === 'RETURN';

      let txnTypeDisplay = 'Sale';
      if (isPayment) txnTypeDisplay = 'Payment-In';
      if (isReturn) txnTypeDisplay = txn.raw?.isCreditNote ? 'Credit Note' : 'Sales Return';

      let paymentType = '—';
      if (isPayment) paymentType = txn.paymentMode || txn.raw?.paymentMode || 'Cash';
      else if (isSale && txn.paidAmount > 0) paymentType = txn.raw?.paymentMode || 'Cash';

      let totalAmount = txn.debit || txn.amount;
      let receivedAmount = txn.receivedAmount || 0;
      let txnBalance = txn.txnBalance !== undefined ? txn.txnBalance : (txn.debit || txn.amount);
      let paymentStatus = 'Unpaid';

      if (isPayment) {
        paymentStatus = 'Used';
        totalAmount = txn.credit || txn.amount;
        receivedAmount = txn.credit || txn.amount;
        txnBalance = 0;
      } else if (isReturn) {
        paymentStatus = 'Paid';
        totalAmount = txn.credit || txn.amount;
        receivedAmount = 0;
        txnBalance = txn.credit || txn.amount;
      } else {
        // Sale
        totalAmount = txn.debit || txn.amount;
        receivedAmount = txn.paidAmount || 0;
        txnBalance = Math.max(0, totalAmount - receivedAmount);
        if (receivedAmount >= totalAmount && totalAmount > 0) {
          paymentStatus = 'Paid';
        } else if (receivedAmount > 0) {
          paymentStatus = 'Partial';
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

    // Apply inline filters
    return formatted.filter((t) => {
      if (txnTypeFilter !== 'ALL' && t.type !== txnTypeFilter) {
        return false;
      }
      if (txnSearchQuery.trim()) {
        const q = txnSearchQuery.toLowerCase().trim();
        const matchRef = (t.refNo || '').toLowerCase().includes(q);
        const matchParticular = (t.particular || '').toLowerCase().includes(q);
        const matchType = (t.txnTypeDisplay || '').toLowerCase().includes(q);
        const matchAmount = String(t.totalAmount || '').includes(q);
        if (!matchRef && !matchParticular && !matchType && !matchAmount) return false;
      }
      return true;
    }).sort((a, b) => {
      const aIso = a.isoDate || parseDateToComparable(a.date) || '';
      const bIso = b.isoDate || parseDateToComparable(b.date) || '';
      if (sortOrder === 'DESC') {
        return bIso.localeCompare(aIso);
      }
      return aIso.localeCompare(bIso);
    });
  }, [ledgerData, txnTypeFilter, txnSearchQuery, sortOrder]);

  // Extract all line items in period for Item Details Sheet / Modal
  const periodItemDetails = useMemo(() => {
    const itemsList = [];
    ledgerData.periodTransactions.forEach((txn) => {
      if ((txn.type === 'SALE' || txn.type === 'RETURN') && txn.raw?.items && Array.isArray(txn.raw.items)) {
        txn.raw.items.forEach((item, idx) => {
          itemsList.push({
            date: txn.date,
            billNo: txn.refNo || (txn.type === 'RETURN' ? `RET-${idx + 1}` : `ORD-${idx + 1}`),
            itemName: item.itemName || item.productName || item.name || 'Spices Item',
            itemCode: item.itemCode || item.productCode || item.code || '—',
            hsn: item.hsn || item.hsnCode || '—',
            qty: item.quantityKg || item.quantity || item.quantityPouch || 1,
            unit: item.unit || (item.quantityKg ? 'Kg' : 'Pouch'),
            rate: item.unitPrice || item.rate || item.pricePerKg || item.sellingPrice || 0,
            discount: item.discount || 0,
            tax: item.tax || 0,
            amount: item.amount || item.subtotal || item.total || (Number(item.unitPrice || item.rate || 0) * Number(item.quantityKg || item.quantity || 1)) || 0,
          });
        });
      }
    });
    return itemsList;
  }, [ledgerData]);

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Multi-Sheet Excel Export Handler (Sheet 1: Party Statement, Sheet 2: Item Details)
  const handleExportExcel = () => {
    try {
      // ── Sheet 1: Party Statement ──
      const headerRows = [
        ['PATEL SAHAB SPICES - PARTY STATEMENT REPORT'],
        [`Party Name: ${shop.name}`, `Owner: ${shop.owner || '—'}`, `Mobile: ${shop.mobile || '—'}`],
        [`Market: ${shop.connectedMarketName || shop.marketName || '—'}`, `Route: ${shop.routeId || '—'}`, `Marketer: ${assignedMarketer}`],
        [`Statement Period: ${formatIsoToDisplay(fromDate)} To ${formatIsoToDisplay(toDate)}`],
        [],
        ['SUMMARY:'],
        ['Total Sale (Sale - Sale Return)', ledgerData.totalSales - ledgerData.totalReturns],
        ['Total Money-In (Collections)', ledgerData.totalCollections],
        ['Total Purchase', 0],
        ['Total Money-Out', 0],
        ['Total Expense', 0],
        ['Total Receivable (Net Outstanding)', ledgerData.closingBalance],
        ['Total Payable', 0],
        [],
        ['TRANSACTIONS LEDGER:'],
        ['DATE', 'TXN TYPE', 'REF NO.', 'PAYMENT TYPE', 'PAYMENT STATUS', 'TOTAL (₹)', 'RECEIVED / PAID (₹)', 'TXN BALANCE (₹)', 'RECEIVABLE BALANCE (₹)', 'PAYABLE BALANCE (₹)'],
        ['—', 'OPENING BALANCE', '—', '—', '—', '', '', '', ledgerData.openingBalance, 0],
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
        0,
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
        0,
      ];

      const ws1 = XLSX.utils.aoa_to_sheet([...headerRows, ...txnRows, closingRow]);

      // ── Sheet 2: Item Details ──
      const itemHeaderRows = [
        ['PATEL SAHAB SPICES - STATEMENT ITEM DETAILS'],
        [`Party: ${shop.name}`, `Period: ${formatIsoToDisplay(fromDate)} To ${formatIsoToDisplay(toDate)}`],
        [],
        ['DATE', 'BILL / REF NO.', 'ITEM NAME', 'ITEM CODE', 'HSN / SAC', 'QUANTITY', 'UNIT', 'RATE (₹)', 'DISCOUNT (₹)', 'TAX (₹)', 'AMOUNT (₹)'],
      ];

      const itemDataRows = periodItemDetails.map((it) => [
        it.date,
        it.billNo,
        it.itemName,
        it.itemCode,
        it.hsn,
        it.qty,
        it.unit,
        it.rate,
        it.discount,
        it.tax,
        it.amount,
      ]);

      const ws2 = XLSX.utils.aoa_to_sheet([...itemHeaderRows, ...itemDataRows]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, 'Party Statement');
      XLSX.utils.book_append_sheet(wb, ws2, 'Item Details');

      const fileName = `${shop.name.replace(/[^a-zA-Z0-9]/g, '_')}_Party_Statement.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      alert('Failed to export Excel: ' + err.message);
    }
  };

  // Edit / Delete Party Handlers
  const handleOpenEdit = () => {
    setEditName(shop.name || '');
    setEditOwner(shop.owner || '');
    setEditMobile(shop.mobile || '');
    setEditAddress(shop.address || '');
    setEditMarketId(shop.marketId || markets[0]?.id || 'mkt-pachore');
    setEditRouteId(shop.routeId || '');
    setEditConnectedMarketId(shop.connectedMarketId || '');
    setEditStatus(shop.status || 'Customer');
    setEditOutstanding(shop.outstanding !== undefined ? String(shop.outstanding) : '0');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    const cm = connectedMarkets.find((c) => c.id === editConnectedMarketId);
    updateShop(shop.id, {
      name: editName.trim(),
      owner: editOwner.trim(),
      mobile: editMobile.trim(),
      address: editAddress.trim(),
      marketId: editMarketId,
      routeId: editRouteId || undefined,
      connectedMarketId: editConnectedMarketId || undefined,
      connectedMarketName: cm?.name || undefined,
      status: editStatus,
      outstanding: editOutstanding ? Number(editOutstanding) : 0,
    });
    setIsEditModalOpen(false);
  };

  const handleDeleteParty = () => {
    deleteShop(shop.id, deleteTransactions);
    setIsDeleteModalOpen(false);
    if (onBack) onBack();
  };

  const editCms = editRouteId
    ? connectedMarkets.filter((c) => c.routeId === editRouteId && c.active)
    : connectedMarkets.filter((c) => c.active);

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
              onClick={handleOpenEdit}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1"
              title="Edit / Rename Party"
            >
              <Edit className="w-3.5 h-3.5 text-blue-600" />
              <span>Edit Party ✏️</span>
            </button>

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1"
              title="Delete Party"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Delete Party 🗑️</span>
            </button>

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
      {/* 3. VYAPAR TRANSACTION TABLE & INLINE CONTROLS                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Inline Search & Type Filters */}
        <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setTxnTypeFilter('ALL')}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${
                txnTypeFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All ({ledgerData.periodTransactions.length})
            </button>

            <button
              type="button"
              onClick={() => setTxnTypeFilter('SALE')}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${
                txnTypeFilter === 'SALE'
                  ? 'bg-red-700 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Sales
            </button>

            <button
              type="button"
              onClick={() => setTxnTypeFilter('PAYMENT')}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${
                txnTypeFilter === 'PAYMENT'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Payment-In
            </button>

            <button
              type="button"
              onClick={() => setTxnTypeFilter('RETURN')}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${
                txnTypeFilter === 'RETURN'
                  ? 'bg-blue-700 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Sales Returns
            </button>
          </div>

          {/* Search Box & Sort Toggle */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={txnSearchQuery}
                onChange={(e) => setTxnSearchQuery(e.target.value)}
                placeholder="Search Ref No., Details..."
                className="bg-white border border-slate-200 rounded-xl py-1 pl-8 pr-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-red-600 w-48 sm:w-56"
              />
              {txnSearchQuery && (
                <button
                  type="button"
                  onClick={() => setTxnSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1"
              title="Toggle Date Sorting"
            >
              <span className="text-[10px] text-slate-400 uppercase">Sort:</span>
              <span>{sortOrder === 'ASC' ? 'Oldest First' : 'Newest First'}</span>
            </button>
          </div>
        </div>

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
                  <th className="p-3 text-right">PAYABLE BALANCE</th>
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
                  <td className="p-3 text-right text-slate-400">₹ 0.00</td>
                  <td className="p-3 text-center print:hidden">—</td>
                </tr>

                {/* Period Transactions */}
                {vyaparTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-10 text-center text-slate-400 font-bold">
                      No transactions found matching the selected filters.
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
                      <td className="p-3 text-right text-slate-400">₹ 0.00</td>
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

              <div>
                <span className="text-slate-700 font-bold">Total Payable: </span>
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
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto">
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
            {selectedTxn.type === 'SALE' && (
              <div className="space-y-2 text-xs">
                <p className="font-bold text-slate-700 uppercase text-[10px]">ORDERED ITEMS BREAKDOWN:</p>
                {selectedTxn.raw?.items && selectedTxn.raw.items.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[9px]">
                        <tr>
                          <th className="p-2">Item Name</th>
                          <th className="p-2 text-right">Qty</th>
                          <th className="p-2 text-right">Unit</th>
                          <th className="p-2 text-right">Rate</th>
                          <th className="p-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedTxn.raw.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-bold text-slate-800">
                              {it.productName || it.name || 'Spices Item'} {it.packSize && `(${it.packSize})`}
                            </td>
                            <td className="p-2 text-right font-bold">
                              {it.quantityKg || it.quantityPouch || it.quantity || 1}
                            </td>
                            <td className="p-2 text-right text-slate-500 font-medium">
                              {it.unit || (it.quantityKg ? 'KG' : 'Pouch')}
                            </td>
                            <td className="p-2 text-right font-bold text-emerald-700">
                              ₹{it.pricePerKg || it.sellingPrice || it.rate || 0}
                            </td>
                            <td className="p-2 text-right font-black text-slate-900">
                              ₹{it.subtotal || it.total || (it.pricePerKg * (it.quantityKg || 1)) || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 font-medium">
                    Item details not available for this historical transaction.
                  </div>
                )}
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. EDIT PARTY MODAL                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-600" />
                  EDIT PARTY / SHOP
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Rename party name, update contact number or market route.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <form id="party-edit-form" onSubmit={handleSaveEdit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Party / Shop Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Mahavir Kirana Store"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Renaming this party will automatically synchronize all associated sales, receipts, and returns.</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Owner Name *</label>
                    <input
                      type="text"
                      required
                      value={editOwner}
                      onChange={(e) => setEditOwner(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Mobile / Phone *</label>
                    <input
                      type="tel"
                      required
                      value={editMobile}
                      onChange={(e) => setEditMobile(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Address</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Main Road, Akodiya"
                  />
                </div>

                {/* Market Hierarchy */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-3">
                  <p className="text-[10px] font-black text-amber-800 uppercase">Market & Route Linkage</p>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Market Route</label>
                    <select
                      value={editRouteId}
                      onChange={(e) => { setEditRouteId(e.target.value); setEditConnectedMarketId(''); }}
                      className="w-full border border-amber-200 bg-white rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">— Select Route (Optional) —</option>
                      {marketRoutes.filter((r) => r.active).map((r) => (
                        <option key={r.id} value={r.id}>{r.name} Route</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Connected Market</label>
                    <select
                      value={editConnectedMarketId}
                      onChange={(e) => setEditConnectedMarketId(e.target.value)}
                      className="w-full border border-amber-200 bg-white rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      disabled={!editRouteId && editCms.length === 0}
                    >
                      <option value="">— Select Connected Market (Optional) —</option>
                      {editCms.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Legacy Market */}
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Market Master Group *</label>
                  <select
                    value={editMarketId}
                    onChange={(e) => setEditMarketId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {markets.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Customer">Customer</option>
                      <option value="Lead">Lead</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Outstanding Balance (₹)</label>
                    <input
                      type="number"
                      value={editOutstanding}
                      onChange={(e) => setEditOutstanding(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="party-edit-form"
                className="flex-1 py-3 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. DELETE PARTY CONFIRMATION MODAL                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-700 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900">Delete Party / Shop?</h3>
              <p className="text-xs text-slate-500 font-medium">
                Are you sure you want to delete <strong className="text-slate-800">{shop.name}</strong>?
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-2">
              <label className="flex items-start gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={deleteTransactions}
                  onChange={(e) => setDeleteTransactions(e.target.checked)}
                  className="mt-0.5 rounded text-red-600 focus:ring-red-500"
                />
                <span>Also delete all linked transactions (orders, collections, returns) for this party</span>
              </label>
              <p className="text-[10px] text-slate-400 pl-5">
                {deleteTransactions
                  ? 'All historical and current bills, receipts, and returns of this party will be permanently deleted.'
                  : 'Ledger records will remain in database but party master profile will be removed.'}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteParty}
                className="flex-1 py-2.5 bg-red-700 text-white font-bold rounded-xl hover:bg-red-800 text-xs"
              >
                Delete Party
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
