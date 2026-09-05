import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import PartyStatementDetail from '../../components/common/PartyStatementDetail';
import OrderEntryForm from '../marketer/OrderEntryForm';
import CollectionForm from '../marketer/CollectionForm';
import ReturnForm from '../marketer/ReturnForm';
import ReceiptModal from '../../components/common/ReceiptModal';
import {
  Search,
  Calendar,
  Filter,
  FileSpreadsheet,
  Printer,
  Plus,
  ArrowUpDown,
  ShoppingBag,
  IndianRupee,
  RotateCcw,
  Store,
  ChevronDown,
  User,
  Share2,
  Eye,
  FileText,
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  Building,
} from 'lucide-react';

export default function AllTransactions() {
  const { currentUser } = useAuth();
  const {
    shops,
    orders,
    collections,
    returns,
    marketers,
    markets,
    getFormattedDate,
    getFormattedTime,
  } = useData();

  // ─────────────────────────────────────────────────────────────
  // 1. FILTER STATES
  // ─────────────────────────────────────────────────────────────
  const [datePreset, setDatePreset] = useState('THIS_MONTH'); // 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL' | 'CUSTOM'
  
  // Date Pickers (DD/MM/YYYY or YYYY-MM-DD)
  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const currentMonthStart = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
  const currentMonthEnd = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate())}`;

  const [fromDate, setFromDate] = useState(currentMonthStart);
  const [toDate, setToDate] = useState(currentMonthEnd);
  
  const [selectedFirm, setSelectedFirm] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState('ALL'); // Marketer ID or 'ALL'
  const [selectedType, setSelectedType] = useState('ALL'); // 'ALL' | 'PAYMENT_IN' | 'SALE' | 'RETURN'
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('ALL'); // 'ALL' | 'Cash' | 'UPI' | 'Cheque' | 'Bank'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedPartyForStatement, setSelectedPartyForStatement] = useState(null);
  const [activeActionModal, setActiveActionModal] = useState(null); // 'add_sale' | 'add_payment' | 'add_return'
  const [activeReceiptTxn, setActiveReceiptTxn] = useState(null);
  const [viewingTxnDetail, setViewingTxnDetail] = useState(null);

  // ─────────────────────────────────────────────────────────────
  // 2. PRESET DATE RANGE HANDLER
  // ─────────────────────────────────────────────────────────────
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'TODAY') {
      const dStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      setFromDate(dStr);
      setToDate(dStr);
    } else if (preset === 'YESTERDAY') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const dStr = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;
      setFromDate(dStr);
      setToDate(dStr);
    } else if (preset === 'THIS_WEEK') {
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay() + 1));
      const lastDay = new Date(now.setDate(now.getDate() - now.getDay() + 7));
      setFromDate(`${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-${pad(firstDay.getDate())}`);
      setToDate(`${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`);
    } else if (preset === 'THIS_MONTH') {
      setFromDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      setToDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(last)}`);
    } else if (preset === 'LAST_MONTH') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
      setFromDate(`${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}-01`);
      setToDate(`${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}-${pad(last)}`);
    } else if (preset === 'ALL') {
      setFromDate('2023-01-01');
      setToDate('2030-12-31');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. COMBINE AND STANDARDIZE ALL TRANSACTIONS
  // ─────────────────────────────────────────────────────────────
  const allNormalizedTransactions = useMemo(() => {
    const list = [];
    let refCounter = 492;

    // Helper to format ISO date
    const parseToIso = (dateStr) => {
      if (!dateStr) return '';
      if (dateStr.includes('-') && dateStr.length === 10 && dateStr.charAt(2) === '-') {
        // DD-MM-YYYY -> YYYY-MM-DD
        const [d, m, y] = dateStr.split('-');
        return `${y}-${m}-${d}`;
      }
      if (dateStr.includes('/') && dateStr.length === 10) {
        const [d, m, y] = dateStr.split('/');
        return `${y}-${m}-${d}`;
      }
      return dateStr;
    };

    const formatToDisplay = (dateStr) => {
      if (!dateStr) return '01/09/2026';
      if (dateStr.includes('-') && dateStr.charAt(4) === '-') {
        // YYYY-MM-DD -> DD/MM/YYYY
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
      }
      if (dateStr.includes('-')) {
        return dateStr.replace(/-/g, '/');
      }
      return dateStr;
    };

    // 1. Collections / Payments-In
    collections.forEach((c) => {
      const shopObj = shops.find((s) => s.id === c.shopId || (s.name && s.name.toLowerCase() === (c.shopName || '').toLowerCase()));
      const isoDate = parseToIso(c.date || c.createdDate || '01-09-2026');
      const amount = Number(c.amount || 0);

      list.push({
        id: c.id,
        rawId: c.id,
        refNo: c.refNo || c.receiptNumber || String(refCounter++),
        date: formatToDisplay(c.date || c.createdDate),
        isoDate,
        partyName: c.shopName || shopObj?.name || 'Customer Party',
        partyPhone: shopObj?.mobile || '',
        shopId: shopObj?.id || c.shopId,
        shop: shopObj,
        category: shopObj?.marketName || shopObj?.connectedMarketName || (shopObj?.address ? shopObj.address.split(',')[0] : 'General'),
        type: 'Payment-In',
        typeKey: 'PAYMENT_IN',
        total: amount,
        received: amount,
        balance: 0,
        paymentMode: c.paymentMode || 'Cash',
        status: 'Used',
        userName: c.marketerName || 'Marketer',
        userId: c.marketerId,
        firm: 'Patel Sahab Spices',
        source: c.source || 'APP',
        remarks: c.remark || 'Payment Received from customer',
      });
    });

    // 2. Orders / Sales
    orders.forEach((o) => {
      const shopObj = shops.find((s) => s.id === o.shopId || (s.name && s.name.toLowerCase() === (o.shopName || '').toLowerCase()));
      const isoDate = parseToIso(o.date || o.createdDate || '01-09-2026');
      const totalAmount = Number(o.grandTotal || o.totalValue || o.subtotal || 0);
      const paid = Number(o.paidAmount || 0);
      const balance = Math.max(0, totalAmount - paid);

      list.push({
        id: o.id,
        rawId: o.id,
        refNo: o.invoiceNo || o.id?.replace('ord-', 'INV-') || String(refCounter++),
        date: formatToDisplay(o.date || o.createdDate),
        isoDate,
        partyName: o.shopName || shopObj?.name || 'Customer Party',
        partyPhone: shopObj?.mobile || '',
        shopId: shopObj?.id || o.shopId,
        shop: shopObj,
        category: shopObj?.marketName || shopObj?.connectedMarketName || (shopObj?.address ? shopObj.address.split(',')[0] : 'General'),
        type: 'Sale',
        typeKey: 'SALE',
        total: totalAmount,
        received: paid,
        balance: balance,
        paymentMode: o.paymentType || 'Credit',
        status: balance === 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid',
        userName: o.marketerName || 'Marketer',
        userId: o.marketerId,
        firm: 'Patel Sahab Spices',
        source: o.source || 'APP',
        remarks: o.remarks || `Sales Order (${o.totalKg || 0} KG)`,
        items: o.items || [],
      });
    });

    // 3. Returns / Credit Notes
    returns.forEach((r) => {
      const shopObj = shops.find((s) => s.id === r.shopId || (s.name && s.name.toLowerCase() === (r.shopName || '').toLowerCase()));
      const isoDate = parseToIso(r.date || r.createdDate || '01-09-2026');
      const amount = Number(r.returnValue || r.amount || 0);

      list.push({
        id: r.id,
        rawId: r.id,
        refNo: r.returnNo || r.id?.replace('ret-', 'CN-') || String(refCounter++),
        date: formatToDisplay(r.date || r.createdDate),
        isoDate,
        partyName: r.shopName || shopObj?.name || 'Customer Party',
        partyPhone: shopObj?.mobile || '',
        shopId: shopObj?.id || r.shopId,
        shop: shopObj,
        category: shopObj?.marketName || shopObj?.connectedMarketName || (shopObj?.address ? shopObj.address.split(',')[0] : 'General'),
        type: 'Sales Return',
        typeKey: 'RETURN',
        total: amount,
        received: amount,
        balance: 0,
        paymentMode: 'Credit Note',
        status: 'Adjusted',
        userName: r.marketerName || 'Marketer',
        userId: r.marketerId,
        firm: 'Patel Sahab Spices',
        source: r.source || 'APP',
        remarks: r.reason ? `Return: ${r.reason}` : 'Stock Return / Credit Note',
      });
    });

    // Sort transactions by date descending
    return list.sort((a, b) => (b.isoDate || '').localeCompare(a.isoDate || ''));
  }, [collections, orders, returns, shops]);

  // ─────────────────────────────────────────────────────────────
  // 4. FILTERED TRANSACTIONS
  // ─────────────────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return allNormalizedTransactions.filter((tx) => {
      // 1. Date Range
      if (fromDate && tx.isoDate && tx.isoDate < fromDate) return false;
      if (toDate && tx.isoDate && tx.isoDate > toDate) return false;

      // 2. User / Marketer
      if (selectedUser !== 'ALL' && tx.userId !== selectedUser && tx.userName !== selectedUser) {
        return false;
      }

      // 3. Transaction Type
      if (selectedType !== 'ALL' && tx.typeKey !== selectedType) {
        return false;
      }

      // 4. Payment Mode
      if (selectedPaymentMode !== 'ALL') {
        const modeNorm = (tx.paymentMode || '').toLowerCase();
        const selectedNorm = selectedPaymentMode.toLowerCase();
        if (!modeNorm.includes(selectedNorm)) return false;
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchParty = tx.partyName.toLowerCase().includes(q);
        const matchRef = tx.refNo.toLowerCase().includes(q);
        const matchCat = tx.category.toLowerCase().includes(q);
        const matchType = tx.type.toLowerCase().includes(q);
        const matchAmt = String(tx.total).includes(q) || String(tx.received).includes(q);
        if (!matchParty && !matchRef && !matchCat && !matchType && !matchAmt) return false;
      }

      return true;
    });
  }, [allNormalizedTransactions, fromDate, toDate, selectedUser, selectedType, selectedPaymentMode, searchQuery]);

  // ─────────────────────────────────────────────────────────────
  // 5. KPI METRICS
  // ─────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    let totalAmt = 0;
    let totalReceived = 0;
    let totalBalance = 0;
    let paymentInCount = 0;
    let salesCount = 0;
    let returnsCount = 0;

    filteredTransactions.forEach((tx) => {
      totalAmt += tx.total;
      totalReceived += tx.received;
      totalBalance += tx.balance;
      if (tx.typeKey === 'PAYMENT_IN') paymentInCount++;
      if (tx.typeKey === 'SALE') salesCount++;
      if (tx.typeKey === 'RETURN') returnsCount++;
    });

    return {
      totalCount: filteredTransactions.length,
      totalAmt,
      totalReceived,
      totalBalance,
      paymentInCount,
      salesCount,
      returnsCount,
    };
  }, [filteredTransactions]);

  // ─────────────────────────────────────────────────────────────
  // 6. EXCEL REPORT EXPORT
  // ─────────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const dataRows = filteredTransactions.map((tx, idx) => ({
      '#': idx + 1,
      'DATE': tx.date,
      'REF NO.': tx.refNo,
      'PARTY NAME': tx.partyName,
      'CATEGORY': tx.category,
      'TYPE': tx.type,
      'TOTAL': tx.total,
      'RECEIVED': tx.received,
      'BALANCE': tx.balance,
      'PAYMENT MODE': tx.paymentMode,
      'STATUS': tx.status,
      'USER / MARKETER': tx.userName,
      'REMARKS': tx.remarks,
    }));

    const ws = XLSX.utils.json_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'All Transactions');
    XLSX.writeFile(wb, `Vyapar_All_Transactions_${fromDate}_to_${toDate}.xlsx`);
  };

  // Print Window Trigger
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      
      {/* 1. TOP HEADER & VYAPAR BANNER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black shadow-sm">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">All Transactions</h1>
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black uppercase">
                Vyapar Report Style
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Unified real-time ledger of Sales, Payments-In, and Returns
            </p>
          </div>
        </div>

        {/* Quick Action Buttons Matching Vyapar Top Right */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveActionModal('add_sale')}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Sale</span>
          </button>

          <button
            onClick={() => setActiveActionModal('add_payment')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Payment-In</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
            title="Download Excel Report"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel Report</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
            title="Print Transactions"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* 2. VYAPAR CONTROL BAR (DATE DROPDOWN, FIRMS, USERS, PAYMENT FILTER) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          
          {/* Preset Date Range Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Date Range</label>
            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-red-600"
            >
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="ALL">All Time</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

          {/* From / To Date Pickers */}
          <div className="space-y-1 sm:col-span-1 md:col-span-1 lg:col-span-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Between Dates</label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-[11px] font-bold text-slate-700"
              />
              <span className="text-slate-400 text-xs font-bold">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-[11px] font-bold text-slate-700"
              />
            </div>
          </div>

          {/* Firm Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Firms</label>
            <select
              value={selectedFirm}
              onChange={(e) => setSelectedFirm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-red-600"
            >
              <option value="ALL">ALL FIRMS</option>
              <option value="Patel Sahab Spices">Patel Sahab Spices</option>
            </select>
          </div>

          {/* User / Marketer Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Users</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-red-600"
            >
              <option value="ALL">ALL USERS</option>
              {marketers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Type Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Transaction Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-red-600"
            >
              <option value="ALL">All Transaction</option>
              <option value="PAYMENT_IN">Payment-In</option>
              <option value="SALE">Sale (Order)</option>
              <option value="RETURN">Sales Return / CN</option>
            </select>
          </div>
        </div>

        {/* Second Filter Row: Search & Payment Mode */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Party Name, Ref No, Mode..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-xs font-semibold focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedPaymentMode}
              onChange={(e) => setSelectedPaymentMode(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700"
            >
              <option value="ALL">All Payment Modes</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI / Online</option>
              <option value="Cheque">Cheque</option>
              <option value="Bank">Bank Transfer</option>
            </select>

            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
              Showing <strong>{filteredTransactions.length}</strong> records
            </span>
          </div>
        </div>
      </div>

      {/* 3. METRICS / KPI SUMMARY BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Transactions</span>
          <p className="text-xl font-black text-slate-900 mt-0.5">{metrics.totalCount}</p>
          <p className="text-[10px] text-slate-500 font-semibold">
            {metrics.salesCount} Sales • {metrics.paymentInCount} Payments
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Amount</span>
          <p className="text-xl font-black text-slate-900 mt-0.5">₹{metrics.totalAmt.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-blue-600 font-bold">Invoices & Collections</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Received</span>
          <p className="text-xl font-black text-emerald-700 mt-0.5">₹{metrics.totalReceived.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-emerald-800 font-bold">Realized Inflow</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Balance / Dues</span>
          <p className="text-xl font-black text-red-700 mt-0.5">₹{metrics.totalBalance.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-red-800 font-bold">Pending Receivables</p>
        </div>
      </div>

      {/* 4. MAIN VYAPAR TRANSACTIONS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-slate-600 font-black uppercase text-[11px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3">DATE</th>
                <th className="py-3 px-3">REF NO.</th>
                <th className="py-3 px-4">PARTY NAME</th>
                <th className="py-3 px-3">CATEGORY</th>
                <th className="py-3 px-3">TYPE</th>
                <th className="py-3 px-3 text-right">TOTAL</th>
                <th className="py-3 px-3 text-right">RECEIVED</th>
                <th className="py-3 px-3 text-right">BALANCE</th>
                <th className="py-3 px-3 text-center">STATUS</th>
                <th className="py-3 px-3 text-center">PRINT / VIEW</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700">No Transactions Found</p>
                    <p className="text-xs text-slate-400">No transaction records match the selected date range and filters.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-amber-50/40 transition-colors group"
                  >
                    <td className="py-3 px-3 text-center font-mono text-slate-400 font-bold">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {tx.date}
                    </td>

                    <td className="py-3 px-3 font-mono font-black text-slate-700 whitespace-nowrap">
                      {tx.refNo}
                    </td>

                    <td className="py-3 px-4">
                      <div
                        onClick={() => tx.shop && setSelectedPartyForStatement(tx.shop)}
                        className="font-extrabold text-slate-900 hover:text-red-700 cursor-pointer flex items-center gap-1.5"
                        title="Click to view full Party Statement"
                      >
                        <span>{tx.partyName}</span>
                        {tx.shop && <ChevronDown className="w-3 h-3 text-slate-400 -rotate-90" />}
                      </div>
                      {tx.userName && (
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          By: {tx.userName}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-600 font-semibold whitespace-nowrap">
                      {tx.category}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                        tx.typeKey === 'PAYMENT_IN'
                          ? 'bg-emerald-100 text-emerald-900'
                          : tx.typeKey === 'SALE'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-red-100 text-red-900'
                      }`}>
                        {tx.type}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                      ₹ {tx.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-3 text-right font-black text-emerald-700 whitespace-nowrap">
                      ₹ {tx.received.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-3 text-right font-black whitespace-nowrap">
                      <span className={tx.balance > 0 ? 'text-red-600' : 'text-slate-400'}>
                        ₹ {tx.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className={`font-bold text-[11px] ${
                        tx.status === 'Used' || tx.status === 'Paid'
                          ? 'text-emerald-700'
                          : tx.status === 'Partial'
                          ? 'text-amber-700'
                          : 'text-red-600'
                      }`}>
                        {tx.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            if (tx.typeKey === 'PAYMENT_IN') {
                              setActiveReceiptTxn(tx);
                            } else {
                              setViewingTxnDetail(tx);
                            }
                          }}
                          className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                          title="Print / View Receipt"
                        >
                          <Printer className="w-4 h-4 text-slate-500 hover:text-slate-900" />
                        </button>

                        <button
                          onClick={() => setViewingTxnDetail(tx)}
                          className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-slate-500 hover:text-slate-900" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Totals */}
        {filteredTransactions.length > 0 && (
          <div className="bg-slate-100 border-t border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-3 font-black text-xs text-slate-800">
            <div>
              <span>TOTAL ROWS: {filteredTransactions.length}</span>
            </div>
            <div className="flex items-center gap-6">
              <span>Total: <span className="text-slate-900 font-mono">₹ {metrics.totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
              <span>Received: <span className="text-emerald-700 font-mono">₹ {metrics.totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
              <span>Balance: <span className="text-red-700 font-mono">₹ {metrics.totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
            </div>
          </div>
        )}
      </div>

      {/* 5. MODALS */}

      {/* Party Statement Modal */}
      {selectedPartyForStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <span className="text-xs font-black uppercase text-amber-400">PARTY STATEMENT</span>
              <button
                onClick={() => setSelectedPartyForStatement(null)}
                className="p-1 rounded-full hover:bg-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 flex-1">
              <PartyStatementDetail
                shop={selectedPartyForStatement}
                onBack={() => setSelectedPartyForStatement(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Sale Modal */}
      {activeActionModal === 'add_sale' && (
        <OrderEntryForm
          onClose={() => setActiveActionModal(null)}
          onOrderSubmitted={() => setActiveActionModal(null)}
        />
      )}

      {/* Quick Add Payment Modal */}
      {activeActionModal === 'add_payment' && (
        <CollectionForm
          onClose={() => setActiveActionModal(null)}
          onCollectionSubmitted={(col) => {
            setActiveActionModal(null);
            setActiveReceiptTxn(col);
          }}
        />
      )}

      {/* Receipt Modal */}
      {activeReceiptTxn && (
        <ReceiptModal
          collection={activeReceiptTxn}
          onClose={() => setActiveReceiptTxn(null)}
        />
      )}

      {/* Viewing Transaction Detail Popup */}
      {viewingTxnDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400">TRANSACTION DETAILS</span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">Ref #{viewingTxnDetail.refNo}</h3>
              </div>
              <button
                onClick={() => setViewingTxnDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-bold">Party Name:</span>
                <span className="font-extrabold text-slate-900">{viewingTxnDetail.partyName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-bold">Date:</span>
                <span className="font-mono font-bold text-slate-800">{viewingTxnDetail.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-bold">Transaction Type:</span>
                <span className="font-black text-slate-800">{viewingTxnDetail.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-bold">Total Amount:</span>
                <span className="font-black text-slate-900">₹{viewingTxnDetail.total.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-bold">Received Amount:</span>
                <span className="font-black text-emerald-700">₹{viewingTxnDetail.received.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-bold">Pending Balance:</span>
                <span className="font-black text-red-600">₹{viewingTxnDetail.balance.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-bold">Payment Mode:</span>
                <span className="font-bold text-slate-800">{viewingTxnDetail.paymentMode}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-bold">Recorded By:</span>
                <span className="font-bold text-slate-800">{viewingTxnDetail.userName}</span>
              </div>
              {viewingTxnDetail.remarks && (
                <div className="pt-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Remarks:</span>
                  <p className="text-slate-700 italic">{viewingTxnDetail.remarks}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewingTxnDetail(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-xs"
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
