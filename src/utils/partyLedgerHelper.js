// Helper utilities for Vyapar-Style Party Statement & Ledger Calculations

export const parseDateToComparable = (dateStr) => {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  // Handle DD-MM-YYYY or DD/MM/YYYY
  const match = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (match) {
    const dd = match[1].padStart(2, '0');
    const mm = match[2].padStart(2, '0');
    let yyyy = match[3];
    if (yyyy.length === 2) yyyy = '20' + yyyy;
    return `${yyyy}-${mm}-${dd}`;
  }
  // Handle YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const yyyy = isoMatch[1];
    const mm = isoMatch[2].padStart(2, '0');
    const dd = isoMatch[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return str;
};

export const formatIsoToDisplay = (isoStr) => {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return isoStr;
};

// Date Presets calculation
export const getDatePresetRange = (preset) => {
  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (preset) {
    case 'today': {
      const dStr = toIso(today);
      return { fromDate: dStr, toDate: dStr, label: 'Today' };
    }
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      const dStr = toIso(y);
      return { fromDate: dStr, toDate: dStr, label: 'Yesterday' };
    }
    case 'this_week': {
      const day = today.getDay(); // 0 is Sunday
      const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diffToMonday);
      return { fromDate: toIso(monday), toDate: toIso(today), label: 'This Week' };
    }
    case 'this_month': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { fromDate: toIso(startOfMonth), toDate: toIso(today), label: 'This Month' };
    }
    case 'prev_month': {
      const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return { fromDate: toIso(startOfPrevMonth), toDate: toIso(endOfPrevMonth), label: 'Previous Month' };
    }
    case 'all_time':
    default: {
      return { fromDate: '2020-01-01', toDate: toIso(today), label: 'All Transactions' };
    }
  }
};

/**
 * Calculates unified running ledger for a party/shop
 */
export const calculatePartyLedger = ({
  shop,
  orders = [],
  collections = [],
  returns = [],
  fromDateIso = '2020-01-01',
  toDateIso = '2099-12-31',
}) => {
  if (!shop) {
    return {
      openingBalance: 0,
      totalSales: 0,
      totalCollections: 0,
      totalReturns: 0,
      closingBalance: 0,
      transactions: [],
      periodTransactions: [],
    };
  }

  const shopId = shop.id;
  const shopNorm = (shop.name || '').toLowerCase().trim();

  // Baseline opening outstanding from shop master
  const baselineOpening = Number(shop.openingOutstanding || shop.openingBalance || 0);

  // 1. Gather all raw orders for this shop
  const shopOrders = orders
    .filter((o) => o.shopId === shopId || (o.shopName && o.shopName.toLowerCase().trim() === shopNorm))
    .map((o) => {
      const dateStr = o.date || o.createdDate || '';
      const isoDate = parseDateToComparable(dateStr);
      const amount = Number(o.grandTotal || o.totalValue || o.subtotal || 0);
      return {
        id: o.id || `ord-${Math.random()}`,
        type: 'SALE',
        particular: 'Sale / Invoice',
        date: dateStr,
        isoDate,
        refNo: o.invoiceNo || o.invoiceRef || o.id,
        debit: amount,
        credit: 0,
        amount,
        itemsCount: o.items?.length || 1,
        totalKg: o.totalKg || 0,
        raw: o,
      };
    });

  // 2. Gather all collections for this shop
  const shopCollections = collections
    .filter((c) => c.shopId === shopId || (c.shopName && c.shopName.toLowerCase().trim() === shopNorm))
    .map((c) => {
      const dateStr = c.date || c.createdDate || '';
      const isoDate = parseDateToComparable(dateStr);
      const amount = Number(c.amount || 0);
      return {
        id: c.id || `col-${Math.random()}`,
        type: 'PAYMENT',
        particular: c.source === 'OLD IMPORT'
          ? `Payment-In (${c.paymentMode || 'Old Collection'})`
          : `Payment Received (${c.paymentMode || 'Cash'})`,
        date: dateStr,
        isoDate,
        refNo: c.receiptNumber || c.invoiceRef || c.id,
        debit: 0,
        credit: amount,
        amount,
        paymentMode: c.paymentMode || 'Cash',
        slipUrl: c.slipUrl || c.photoUrl || null,
        raw: c,
      };
    });

  // 3. Gather all returns for this shop
  const shopReturns = returns
    .filter((r) => r.shopId === shopId || (r.shopName && r.shopName.toLowerCase().trim() === shopNorm))
    .map((r) => {
      const dateStr = r.date || r.createdDate || '';
      const isoDate = parseDateToComparable(dateStr);
      const amount = Number(r.returnValue || r.amount || 0);
      return {
        id: r.id || `ret-${Math.random()}`,
        type: 'RETURN',
        particular: `Sales Return (${r.productName || 'Goods'})`,
        date: dateStr,
        isoDate,
        refNo: r.invoiceNo || r.invoiceRef || r.id,
        debit: 0,
        credit: amount,
        amount,
        quantityKg: r.quantityKg || 1,
        reason: r.reason || 'Damage/Expiries',
        raw: r,
      };
    });

  // Combine and sort chronologically (oldest first for ledger sequence)
  const allChronological = [...shopOrders, ...shopCollections, ...shopReturns].sort((a, b) => {
    if (a.isoDate === b.isoDate) {
      // Prioritize Sales before Collections on same date
      if (a.type === 'SALE' && b.type !== 'SALE') return -1;
      if (a.type !== 'SALE' && b.type === 'SALE') return 1;
      return 0;
    }
    return (a.isoDate || '').localeCompare(b.isoDate || '');
  });

  // Calculate Opening Balance before `fromDateIso`
  let openingBalance = baselineOpening;
  const periodTransactionsRaw = [];

  allChronological.forEach((txn) => {
    if (txn.isoDate < fromDateIso) {
      if (txn.type === 'SALE') {
        openingBalance += txn.debit;
      } else {
        openingBalance -= txn.credit;
      }
    } else if (txn.isoDate <= toDateIso) {
      periodTransactionsRaw.push(txn);
    }
  });

  // Compute running balance for period transactions
  let currentRunningBalance = openingBalance;
  let totalSales = 0;
  let totalCollections = 0;
  let totalReturns = 0;

  const periodTransactions = periodTransactionsRaw.map((txn) => {
    if (txn.type === 'SALE') {
      currentRunningBalance += txn.debit;
      totalSales += txn.debit;
    } else if (txn.type === 'PAYMENT') {
      currentRunningBalance -= txn.credit;
      totalCollections += txn.credit;
    } else if (txn.type === 'RETURN') {
      currentRunningBalance -= txn.credit;
      totalReturns += txn.credit;
    }

    return {
      ...txn,
      runningBalance: currentRunningBalance,
    };
  });

  const closingBalance = openingBalance + totalSales - totalCollections - totalReturns;

  // Determine payment status
  let paymentStatus = 'Paid';
  if (closingBalance > 0) {
    const hasPayments = totalCollections > 0 || shopCollections.length > 0;
    paymentStatus = hasPayments ? 'Partially Paid' : 'Outstanding';
  }

  return {
    openingBalance,
    totalSales,
    totalCollections,
    totalReturns,
    closingBalance,
    paymentStatus,
    periodTransactions,
    allTransactions: allChronological,
  };
};
