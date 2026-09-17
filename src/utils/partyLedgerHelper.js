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
 * Normalizes text by lowercasing, removing parenthetical notations like (JHALDA),
 * removing punctuation, and trimming extra spaces.
 */
export const normalizeShopName = (txt) => {
  return String(txt || '')
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Robust matcher to check if a transaction/record belongs to a given target shop.
 * Handles exact ID, exact name, fuzzy token overlap, phone match, etc.
 */
export const isShopMatchingRecord = (record, targetShop) => {
  if (!record || !targetShop) return false;

  // 1. Direct ID match
  if (record.shopId && targetShop.id && String(record.shopId).trim() === String(targetShop.id).trim()) {
    return true;
  }

  // 2. Mobile / Phone match (10 digits)
  const rPhone = String(record.mobile || record.phone || '').replace(/[^0-9]/g, '');
  const sPhone = String(targetShop.mobile || targetShop.phone || '').replace(/[^0-9]/g, '');
  if (rPhone && sPhone && rPhone.length >= 10 && sPhone.length >= 10 && rPhone.slice(-10) === sPhone.slice(-10)) {
    return true;
  }

  // 3. Name Normalization & Token Comparison
  const rName = normalizeShopName(record.shopName || record.partyName || record.name);
  const sName = normalizeShopName(targetShop.name);

  if (!rName || !sName) return false;

  // 3a. Exact normalized match
  if (rName === sName) return true;

  // 3b. Substring contains match
  if (rName.includes(sName) || sName.includes(rName)) return true;

  // 3c. Significant token overlap (excluding generic business terms and market/town names)
  const stopWords = new Set([
    'store', 'stores', 'traders', 'shop', 'centre', 'center', 'mart', 'provision', 'general', 'super', 'kirana',
    'and', 'the', 'pvt', 'ltd', 'enterprise', 'enterprises', 'agency', 'agencies', 'co', 'company', 'spices',
    'jhadla', 'jhalda', 'akodia', 'akodiya', 'pachore', 'ashta', 'kalapipal', 'shujalpur', 'sarangpur', 'biaora',
    'indore', 'ujjain', 'sehore', 'dewas', 'gulana', 'chakrod', 'jamner', 'bolai', 'tarana', 'shajapur',
    'mandi', 'road', 'market', 'nagar', 'colony', 'city', 'freegang', 'stand', 'bus', 'square', 'jod',
    'kheda', 'khedi', 'kalan', 'khurd', 'bazar', 'bazaar'
  ]);
  const rTokens = rName.split(' ').filter((w) => w.length >= 3 && !stopWords.has(w));
  const sTokens = sName.split(' ').filter((w) => w.length >= 3 && !stopWords.has(w));

  if (rTokens.length > 0 && sTokens.length > 0) {
    const common = rTokens.filter((t) => sTokens.includes(t));
    // If the primary distinct name matches (e.g. "aakash" or "rathore")
    if (common.length >= 1) {
      // If either has only 1 distinct token, it must match
      if (rTokens.length === 1 || sTokens.length === 1) return true;
      // If multiple distinct tokens exist, require at least half to match
      if (common.length >= Math.min(rTokens.length, sTokens.length) / 2) return true;
    }
  }

  return false;
};

/**
 * Calculates unified running ledger for a party/shop matching Vyapar accounting rules.
 *
 * Rules:
 * 1. Sale: Adds gross amount (debit) to total sales. Direct cash received on the spot (paidAmount)
 *    is credited directly against the invoice, changing running receivable by +(debit - paidAmount).
 *    No fake/duplicate Payment-In row is created.
 * 2. Payment-In: Standalone payment receipt. Decreases running receivable by -credit.
 * 3. Credit Note / Sales Return: Decreases running receivable by -credit.
 * 4. Closing Receivable = Opening + Total Sales - Total Collections (Payment-In + Direct on Sale) - Total Returns.
 */
export const calculatePartyLedger = (
  arg1,
  arg2 = [],
  arg3 = [],
  arg4 = [],
  arg5 = '2020-01-01',
  arg6 = '2099-12-31'
) => {
  let shop, orders, collections, returns, fromDateIso, toDateIso;

  if (arg1 && typeof arg1 === 'object' && 'shop' in arg1) {
    // Destructured object: calculatePartyLedger({ shop, orders, collections, returns, ... })
    shop = arg1.shop;
    orders = Array.isArray(arg1.orders) ? arg1.orders : [];
    collections = Array.isArray(arg1.collections) ? arg1.collections : [];
    returns = Array.isArray(arg1.returns) ? arg1.returns : [];
    fromDateIso = typeof arg1.fromDateIso === 'string' ? arg1.fromDateIso : '2020-01-01';
    toDateIso = typeof arg1.toDateIso === 'string' ? arg1.toDateIso : '2099-12-31';
  } else {
    // Positional parameters: calculatePartyLedger(shop, orders, collections, returns, ...)
    shop = arg1;
    orders = Array.isArray(arg2) ? arg2 : [];
    collections = Array.isArray(arg3) ? arg3 : [];
    returns = Array.isArray(arg4) ? arg4 : [];
    fromDateIso = typeof arg5 === 'string' ? arg5 : '2020-01-01';
    toDateIso = typeof arg6 === 'string' ? arg6 : '2099-12-31';
  }

  if (!shop) {
    return {
      openingBalance: 0,
      totalSales: 0,
      totalCollections: 0,
      totalReturns: 0,
      closingBalance: 0,
      paymentStatus: 'Paid',
      transactions: [],
      periodTransactions: [],
      allTransactions: [],
    };
  }

  // Baseline opening outstanding from shop master
  const baselineOpening = Number(shop.openingOutstanding || shop.openingReceivable || shop.openingBalance || 0);

  // 1. Gather all raw orders for this shop using robust fuzzy matcher
  const matchedOrders = orders.filter((o) => isShopMatchingRecord(o, shop));
  const shopOrders = matchedOrders.map((o) => {
    const dateStr = o.date || o.createdDate || '';
    const isoDate = parseDateToComparable(dateStr);
    const amount = Number(o.grandTotal || o.totalValue || o.subtotal || o.amount || 0);
    const paidAmount = Number(o.paidAmount || 0);
    return {
      id: o.id || `ord-${Math.random()}`,
      type: 'SALE',
      particular: 'Sale / Invoice',
      date: dateStr,
      isoDate,
      refNo: o.invoiceNo || o.invoiceRef || o.billNo || o.id,
      debit: amount,
      credit: 0,
      amount,
      paidAmount,
      itemsCount: o.items?.length || 1,
      totalKg: o.totalKg || 0,
      raw: o,
    };
  });

  // 2. Gather all collections for this shop using robust fuzzy matcher
  const matchedCollections = collections.filter((c) => isShopMatchingRecord(c, shop));
  const shopCollections = matchedCollections.map((c) => {
    const dateStr = c.date || c.createdDate || '';
    const isoDate = parseDateToComparable(dateStr);
    const amount = Number(c.amount || 0);
    return {
      id: c.id || `col-${Math.random()}`,
      type: 'PAYMENT',
      particular:
        c.source === 'OLD IMPORT' || c.source === 'OLD_IMPORT'
          ? `Payment-In (${c.paymentMode || 'Old Collection'})`
          : `Payment Received (${c.paymentMode || 'Cash'})`,
      date: dateStr,
      isoDate,
      refNo: c.receiptNumber || c.refNo || c.invoiceRef || c.id,
      debit: 0,
      credit: amount,
      amount,
      paymentMode: c.paymentMode || 'Cash',
      slipUrl: c.slipUrl || c.photoUrl || null,
      raw: c,
    };
  });

  // 3. Gather all returns for this shop using robust fuzzy matcher
  const matchedReturns = returns.filter((r) => isShopMatchingRecord(r, shop));
  const shopReturns = matchedReturns.map((r) => {
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

  // Combine and sort chronologically (oldest first for running ledger)
  const allChronological = [...shopOrders, ...shopCollections, ...shopReturns].sort((a, b) => {
    const aIso = a.isoDate || '';
    const bIso = b.isoDate || '';
    if (aIso === bIso) {
      if (a.type === 'SALE' && b.type !== 'SALE') return -1;
      if (a.type !== 'SALE' && b.type === 'SALE') return 1;
      if (a.type === 'RETURN' && b.type === 'PAYMENT') return -1;
      if (a.type === 'PAYMENT' && b.type === 'RETURN') return 1;
      return 0;
    }
    return aIso.localeCompare(bIso);
  });

  // Calculate Opening Balance before `fromDateIso`
  let openingBalance = baselineOpening;
  const periodTransactionsRaw = [];

  allChronological.forEach((txn) => {
    const txnPaid = txn.type === 'SALE' ? Number(txn.paidAmount || 0) : 0;
    if (txn.isoDate < fromDateIso) {
      if (txn.type === 'SALE') {
        openingBalance += (txn.debit - txnPaid);
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
    let txnReceived = 0;
    let txnBalance = 0;

    if (txn.type === 'SALE') {
      txnReceived = Number(txn.paidAmount || 0);
      txnBalance = Math.max(0, txn.debit - txnReceived);
      currentRunningBalance += (txn.debit - txnReceived);
      totalSales += txn.debit;
      totalCollections += txnReceived;
    } else if (txn.type === 'PAYMENT') {
      txnReceived = txn.credit;
      txnBalance = 0;
      currentRunningBalance -= txn.credit;
      totalCollections += txn.credit;
    } else if (txn.type === 'RETURN') {
      txnReceived = 0;
      txnBalance = txn.credit;
      currentRunningBalance -= txn.credit;
      totalReturns += txn.credit;
    }

    return {
      ...txn,
      receivedAmount: txnReceived,
      txnBalance,
      runningBalance: Number(currentRunningBalance.toFixed(2)),
    };
  });

  const closingBalance = Number((openingBalance + totalSales - totalCollections - totalReturns).toFixed(2));

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
