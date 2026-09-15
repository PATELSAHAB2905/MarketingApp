import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Users,
  Store,
  ArrowRight,
  RotateCcw,
  Clock,
  Eye,
  Download,
  AlertCircle,
  FileText,
  Search,
  CheckSquare,
  Square,
  ShoppingBag,
  IndianRupee,
  Layers,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Filter,
  RefreshCw,
  HelpCircle,
  TrendingUp,
  Tag,
} from 'lucide-react';

// ============================================================================
// HELPER UTILITIES: NUMBER, DATE & NORMALIZATION
// ============================================================================

const cleanNumber = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const num = Number(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
};

const parseDateString = (val) => {
  if (!val) return '';
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) {
      const dd = String(d.d).padStart(2, '0');
      const mm = String(d.m).padStart(2, '0');
      const yyyy = d.y;
      return `${dd}-${mm}-${yyyy}`;
    }
  }
  if (val instanceof Date && !isNaN(val)) {
    const dd = String(val.getDate()).padStart(2, '0');
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const yyyy = val.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
  const str = String(val).trim();
  // If DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const match = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (match) {
    const dd = match[1].padStart(2, '0');
    const mm = match[2].padStart(2, '0');
    let yyyy = match[3];
    if (yyyy.length === 2) yyyy = '20' + yyyy;
    return `${dd}-${mm}-${yyyy}`;
  }
  // If YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const yyyy = isoMatch[1];
    const mm = isoMatch[2].padStart(2, '0');
    const dd = isoMatch[3].padStart(2, '0');
    return `${dd}-${mm}-${yyyy}`;
  }
  return str;
};

const normalizeStr = (txt) =>
  String(txt || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Classify Transaction Type
const classifyTxnType = (rawType = '', debitVal = 0, creditVal = 0, desc = '') => {
  const t = String(rawType || '').toLowerCase().trim();
  const d = String(desc || '').toLowerCase().trim();

  if (t.includes('opening') || d.includes('opening balance') || t.includes('open bal')) {
    return 'OPENING';
  }
  if (t.includes('return') || t.includes('credit note') || t === 'cn' || d.includes('sales return') || d.includes('credit note')) {
    return 'RETURN';
  }
  if (t.includes('payment') || t.includes('receipt') || t.includes('received') || t.includes('bank') || t.includes('cash in') || (creditVal > 0 && debitVal === 0)) {
    return 'COLLECTION';
  }
  if (t.includes('sale') || t.includes('invoice') || t.includes('bill') || t.includes('tax inv') || (debitVal > 0 && creditVal === 0)) {
    return 'SALE';
  }
  if (debitVal > 0) return 'SALE';
  if (creditVal > 0) return 'COLLECTION';
  return 'OTHER';
};

// ============================================================================
// MAIN COMPONENT: HISTORICAL DATA IMPORT
// ============================================================================

export default function OldDataImport({ onNavigate }) {
  const { currentUser } = useAuth();
  const {
    markets,
    shops,
    orders,
    collections,
    returns,
    importBatches = [],
    importHistoricalBusinessData,
    getFormattedDate,
    getFormattedTime,
  } = useData();

  // Active Main View Tab
  // 1. master, 2. sales, 3. items, 4. collections, 5. returns, 6. opening, 7. history, 8. errors
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'parties' | 'sales' | 'items' | 'collections' | 'returns' | 'opening' | 'history' | 'errors'

  // Wizard Upload State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1: Market & Upload, 2: Column Mapping, 3: Preview & Confirm, 4: Success
  const [selectedMarketId, setSelectedMarketId] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsingError, setParsingError] = useState('');

  // Parsed Multi-Sheet Structures
  const [rawSheets, setRawSheets] = useState({}); // { sheetName: rawRows[][] }
  const [sheetNamesList, setSheetNamesList] = useState([]);
  const [statementSheetName, setStatementSheetName] = useState('');
  const [itemsSheetName, setItemsSheetName] = useState('');

  // Column Mappings for Statement Sheet
  const [statementColMap, setStatementColMap] = useState({
    date: -1,
    txnType: -1,
    invoiceNo: -1,
    partyName: -1,
    phone: -1,
    email: -1,
    totalAmount: -1,
    received: -1,
    receivableBalance: -1,
    payableBalance: -1,
    paymentType: -1,
    paymentRef: -1,
    description: -1,
  });

  // Column Mappings for Item Details Sheet
  const [itemColMap, setItemColMap] = useState({
    date: -1,
    invoiceNo: -1,
    partyName: -1,
    itemName: -1,
    itemCode: -1,
    hsn: -1,
    category: -1,
    quantity: -1,
    unit: -1,
    unitPrice: -1,
    discount: -1,
    amount: -1,
  });

  // Analysis & Preview Results
  const [parsedPreviewData, setParsedPreviewData] = useState({
    summary: {
      totalRows: 0,
      newPartiesCount: 0,
      existingPartiesCount: 0,
      salesCount: 0,
      itemsCount: 0,
      collectionsCount: 0,
      returnsCount: 0,
      openingBalancesCount: 0,
      duplicatesCount: 0,
      errorsCount: 0,
    },
    detectedParties: [], // { id, name, phone, email, isNew, existingShopId, openingReceivable, openingPayable }
    detectedOrders: [], // { invoiceNo, billDate, partyName, shopId, subtotal, grandTotal, items: [], isDuplicate }
    detectedItems: [], // { invoiceNo, date, partyName, itemName, itemCode, hsn, qty, unit, unitPrice, amount }
    detectedCollections: [], // { refNo, date, partyName, shopId, amount, paymentMode, invoiceRef, isDuplicate }
    detectedReturns: [], // { invoiceNo, date, partyName, shopId, productName, qty, amount, reason, isDuplicate }
    detectedOpenings: [], // { partyName, shopId, receivable, payable, date }
    errorRows: [], // { rowIdx, sheet, partyName, invoiceNo, reason, rawData }
  });

  // Filters for Data Tables
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMarket, setFilterMarket] = useState('ALL');

  // Selected Market Object
  const selectedMarket = useMemo(() => {
    return markets.find((m) => m.id === selectedMarketId) || null;
  }, [markets, selectedMarketId]);

  // Historical Records Filtered from DataContext
  const historicalShops = useMemo(() => {
    return shops.filter((s) => s.source === 'OLD_IMPORT' || s.source === 'OLD IMPORT' || s.isHistorical);
  }, [shops]);

  const historicalOrders = useMemo(() => {
    return orders.filter((o) => o.source === 'OLD_IMPORT' || o.source === 'OLD IMPORT' || o.dataSource === 'OLD IMPORT' || o.isHistorical);
  }, [orders]);

  const historicalCollections = useMemo(() => {
    return collections.filter((c) => c.source === 'OLD_IMPORT' || c.source === 'OLD IMPORT' || c.dataSource === 'OLD IMPORT' || c.isHistorical);
  }, [collections]);

  const historicalReturns = useMemo(() => {
    return returns.filter((r) => r.source === 'OLD_IMPORT' || r.source === 'OLD IMPORT' || r.dataSource === 'OLD IMPORT' || r.isHistorical);
  }, [returns]);

  // Flattened historical sale items for report tab
  const historicalSaleItems = useMemo(() => {
    const list = [];
    historicalOrders.forEach((o) => {
      if (Array.isArray(o.items) && o.items.length > 0) {
        o.items.forEach((it, idx) => {
          list.push({
            id: `${o.id}-item-${idx}`,
            orderId: o.id,
            billNo: o.invoiceNo || o.billNo || o.id,
            date: o.date,
            partyName: o.shopName,
            marketName: o.marketName,
            itemName: it.productName || it.name || 'Spice Item',
            itemCode: it.itemCode || '',
            hsn: it.hsn || '',
            category: it.category || 'Spices',
            quantity: it.quantityKg || it.quantity || 0,
            unit: it.unit || 'KG',
            unitPrice: it.unitPrice || it.rate || 0,
            discount: it.discount || 0,
            amount: it.subtotal || it.amount || 0,
          });
        });
      } else {
        list.push({
          id: `${o.id}-item-0`,
          orderId: o.id,
          billNo: o.invoiceNo || o.billNo || o.id,
          date: o.date,
          partyName: o.shopName,
          marketName: o.marketName,
          itemName: 'Mixed Spices Order',
          itemCode: '',
          hsn: '',
          category: 'Spices',
          quantity: o.totalKg || 0,
          unit: 'KG',
          unitPrice: o.grandTotal && o.totalKg ? Math.round(o.grandTotal / o.totalKg) : 0,
          discount: 0,
          amount: o.grandTotal || o.subtotal || 0,
        });
      }
    });
    return list;
  }, [historicalOrders]);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. FILE UPLOAD & MULTI-SHEET DETECTION
  // ──────────────────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (!selectedMarketId) {
      alert('Please select a Market first before uploading Excel / CSV!');
      return;
    }

    setFile(uploadedFile);
    setFileName(uploadedFile.name);
    setIsParsing(true);
    setParsingError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });

        if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
          setParsingError('The selected file is empty or invalid.');
          setIsParsing(false);
          return;
        }

        const sheetsData = {};
        workbook.SheetNames.forEach((sheetName) => {
          const ws = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
          sheetsData[sheetName] = json;
        });

        setRawSheets(sheetsData);
        setSheetNamesList(workbook.SheetNames);

        // Auto-detect Statement Sheet & Items Sheet
        let detectedStatementSheet = '';
        let detectedItemsSheet = '';

        workbook.SheetNames.forEach((sName) => {
          const sLower = sName.toLowerCase();
          if (sLower.includes('statement') || sLower.includes('party') || sLower.includes('ledger') || sLower.includes('report')) {
            if (!detectedStatementSheet) detectedStatementSheet = sName;
          }
          if (sLower.includes('item') || sLower.includes('product') || sLower.includes('detail') || sLower.includes('line')) {
            if (!detectedItemsSheet) detectedItemsSheet = sName;
          }
        });

        if (!detectedStatementSheet) detectedStatementSheet = workbook.SheetNames[0];
        if (!detectedItemsSheet && workbook.SheetNames.length > 1) {
          detectedItemsSheet = workbook.SheetNames.find((s) => s !== detectedStatementSheet) || '';
        }

        setStatementSheetName(detectedStatementSheet);
        setItemsSheetName(detectedItemsSheet);

        // Auto Map Columns for Statement Sheet
        autoMapStatementColumns(sheetsData[detectedStatementSheet] || []);

        // Auto Map Columns for Items Sheet (if present)
        if (detectedItemsSheet && sheetsData[detectedItemsSheet]) {
          autoMapItemColumns(sheetsData[detectedItemsSheet]);
        }

        setIsParsing(false);
        setWizardStep(2); // Proceed to Column Mapping review
      } catch (err) {
        console.error('Failed to parse Excel file:', err);
        setParsingError(`Failed to parse Excel file: ${err?.message || 'Unknown format error'}`);
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setParsingError('Failed to read file from disk.');
      setIsParsing(false);
    };

    reader.readAsBinaryString(uploadedFile);
  };

  // Auto Column Mapper for Party Statement Sheet
  const autoMapStatementColumns = (sheetRows = []) => {
    if (!sheetRows || sheetRows.length === 0) return;

    // Scan first 10 rows for header
    let headerIdx = 0;
    for (let i = 0; i < Math.min(10, sheetRows.length); i++) {
      const row = (sheetRows[i] || []).map((c) => String(c).toLowerCase().trim());
      if (
        row.some(
          (c) =>
            c.includes('party') ||
            c.includes('date') ||
            c.includes('invoice') ||
            c.includes('bill') ||
            c.includes('txn') ||
            c.includes('amount') ||
            c.includes('received') ||
            c.includes('balance')
        )
      ) {
        headerIdx = i;
        break;
      }
    }

    const headers = (sheetRows[headerIdx] || []).map((c) => String(c).toLowerCase().trim());

    const findCol = (aliases) => {
      return headers.findIndex((h) => aliases.some((a) => h === a || h.includes(a)));
    };

    setStatementColMap({
      date: findCol(['date', 'txn date', 'invoice date', 'bill date', 'entry date']),
      txnType: findCol(['txn type', 'transaction type', 'type', 'vch type', 'particulars']),
      invoiceNo: findCol(['invoice no', 'bill no', 'vch no', 'ref no', 'invoice', 'bill', 'document']),
      partyName: findCol(['party name', 'party', 'customer name', 'shop name', 'account name', 'customer']),
      phone: findCol(['phone', 'mobile', 'contact']),
      email: findCol(['email', 'mail']),
      totalAmount: findCol(['total amount', 'total', 'debit', 'sale amount', 'invoice amount', 'amount']),
      received: findCol(['received', 'paid', 'credit', 'payment', 'collection', 'payment-in']),
      receivableBalance: findCol(['receivable balance', 'receivable', 'closing balance', 'balance']),
      payableBalance: findCol(['payable balance', 'payable']),
      paymentType: findCol(['payment type', 'payment mode', 'mode', 'type']),
      paymentRef: findCol(['payment reference', 'ref no', 'cheque no', 'utr', 'transaction id']),
      description: findCol(['description', 'narration', 'remark', 'remarks', 'notes']),
    });
  };

  // Auto Column Mapper for Item Details Sheet
  const autoMapItemColumns = (sheetRows = []) => {
    if (!sheetRows || sheetRows.length === 0) return;

    let headerIdx = 0;
    for (let i = 0; i < Math.min(10, sheetRows.length); i++) {
      const row = (sheetRows[i] || []).map((c) => String(c).toLowerCase().trim());
      if (
        row.some(
          (c) =>
            c.includes('item') ||
            c.includes('product') ||
            c.includes('qty') ||
            c.includes('quantity') ||
            c.includes('rate') ||
            c.includes('price') ||
            c.includes('amount')
        )
      ) {
        headerIdx = i;
        break;
      }
    }

    const headers = (sheetRows[headerIdx] || []).map((c) => String(c).toLowerCase().trim());
    const findCol = (aliases) => headers.findIndex((h) => aliases.some((a) => h === a || h.includes(a)));

    setItemColMap({
      date: findCol(['date', 'invoice date', 'bill date']),
      invoiceNo: findCol(['invoice no', 'bill no', 'vch no', 'invoice', 'bill']),
      partyName: findCol(['party name', 'party', 'customer name', 'shop name']),
      itemName: findCol(['item name', 'product name', 'item', 'product', 'goods description', 'description']),
      itemCode: findCol(['item code', 'product code', 'code', 'sku']),
      hsn: findCol(['hsn', 'hsn/sac', 'sac']),
      category: findCol(['category', 'group']),
      quantity: findCol(['quantity', 'qty', 'qty (kg)', 'total kg', 'weight']),
      unit: findCol(['unit', 'uom', 'pack size']),
      unitPrice: findCol(['unit price', 'rate', 'price', 'rate/kg', 'item rate']),
      discount: findCol(['discount', 'disc']),
      amount: findCol(['amount', 'total', 'item amount', 'net amount']),
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 2. INTELLIGENT PROCESSING & DUPLICATE DETECTION (STEP 2 -> 3)
  // ──────────────────────────────────────────────────────────────────────────
  const processAndAnalyzeExcel = () => {
    setIsParsing(true);

    try {
      const stmtRows = rawSheets[statementSheetName] || [];
      const itemRows = itemsSheetName ? rawSheets[itemsSheetName] || [] : [];

      const detectedPartiesMap = new Map(); // key: normName -> Party Object
      const detectedOrdersList = [];
      const detectedItemsList = [];
      const detectedCollectionsList = [];
      const detectedReturnsList = [];
      const detectedOpeningsList = [];
      const errorRowsList = [];

      // Existing shops lookup maps
      const existingShopsByName = new Map();
      const existingShopsByPhone = new Map();

      shops.forEach((s) => {
        const n = normalizeStr(s.name);
        if (n) existingShopsByName.set(n, s);
        if (s.mobile) existingShopsByPhone.set(String(s.mobile).replace(/[^0-9]/g, ''), s);
      });

      // Existing orders/collections uniqueness sets
      const existingOrderKeys = new Set(
        orders.map((o) => `${normalizeStr(o.shopName)}_${String(o.invoiceNo || o.billNo || '').trim()}_${o.date}`)
      );
      const existingCollectionKeys = new Set(
        collections.map((c) => `${normalizeStr(c.shopName)}_${c.date}_${c.amount}`)
      );
      const existingReturnKeys = new Set(
        returns.map((r) => `${normalizeStr(r.shopName)}_${String(r.invoiceNo || '').trim()}_${r.date}`)
      );

      // --- A. Process Item Details Sheet (if present) ---
      const itemsByInvoiceMap = new Map(); // invoiceNo -> Array of item objects

      if (itemRows.length > 0) {
        let itemHeaderIdx = 0;
        for (let i = 0; i < Math.min(10, itemRows.length); i++) {
          const row = (itemRows[i] || []).map((c) => String(c).toLowerCase().trim());
          if (row.some((c) => c.includes('item') || c.includes('product') || c.includes('qty') || c.includes('amount'))) {
            itemHeaderIdx = i;
            break;
          }
        }

        for (let r = itemHeaderIdx + 1; r < itemRows.length; r++) {
          const row = itemRows[r];
          if (!row || row.length === 0) continue;

          const rawParty = itemColMap.partyName !== -1 ? String(row[itemColMap.partyName] || '').trim() : '';
          const rawInv = itemColMap.invoiceNo !== -1 ? String(row[itemColMap.invoiceNo] || '').trim() : '';
          const rawItem = itemColMap.itemName !== -1 ? String(row[itemColMap.itemName] || '').trim() : '';
          const rawQty = itemColMap.quantity !== -1 ? cleanNumber(row[itemColMap.quantity]) : 0;
          const rawPrice = itemColMap.unitPrice !== -1 ? cleanNumber(row[itemColMap.unitPrice]) : 0;
          const rawAmt = itemColMap.amount !== -1 ? cleanNumber(row[itemColMap.amount]) : rawQty * rawPrice;
          const rawDate = itemColMap.date !== -1 ? parseDateString(row[itemColMap.date]) : getFormattedDate();

          if (!rawItem && !rawInv && rawAmt === 0) continue;

          const itemObj = {
            id: `hist-item-${r}-${Date.now()}`,
            invoiceNo: rawInv,
            date: rawDate,
            partyName: rawParty,
            itemName: rawItem || 'Spice Product',
            itemCode: itemColMap.itemCode !== -1 ? String(row[itemColMap.itemCode] || '').trim() : '',
            hsn: itemColMap.hsn !== -1 ? String(row[itemColMap.hsn] || '').trim() : '',
            category: itemColMap.category !== -1 ? String(row[itemColMap.category] || '').trim() : 'Spices',
            quantity: rawQty,
            quantityKg: rawQty,
            unit: itemColMap.unit !== -1 ? String(row[itemColMap.unit] || 'KG').trim() : 'KG',
            unitPrice: rawPrice,
            rate: rawPrice,
            discount: itemColMap.discount !== -1 ? cleanNumber(row[itemColMap.discount]) : 0,
            amount: rawAmt,
            subtotal: rawAmt,
          };

          detectedItemsList.push(itemObj);

          if (rawInv) {
            const cleanInv = rawInv.toLowerCase().trim();
            if (!itemsByInvoiceMap.has(cleanInv)) {
              itemsByInvoiceMap.set(cleanInv, []);
            }
            itemsByInvoiceMap.get(cleanInv).push(itemObj);
          }
        }
      }

      // --- B. Process Party Statement Report Sheet ---
      let stmtHeaderIdx = 0;
      for (let i = 0; i < Math.min(10, stmtRows.length); i++) {
        const row = (stmtRows[i] || []).map((c) => String(c).toLowerCase().trim());
        if (row.some((c) => c.includes('party') || c.includes('date') || c.includes('amount') || c.includes('balance'))) {
          stmtHeaderIdx = i;
          break;
        }
      }

      let runningPartyName = '';

      for (let r = stmtHeaderIdx + 1; r < stmtRows.length; r++) {
        const row = stmtRows[r];
        if (!row || row.length === 0) continue;

        let rawParty = statementColMap.partyName !== -1 ? String(row[statementColMap.partyName] || '').trim() : '';
        if (rawParty) runningPartyName = rawParty;
        else rawParty = runningPartyName;

        const rawDate = statementColMap.date !== -1 ? parseDateString(row[statementColMap.date]) : '';
        const rawType = statementColMap.txnType !== -1 ? String(row[statementColMap.txnType] || '').trim() : '';
        const rawInv = statementColMap.invoiceNo !== -1 ? String(row[statementColMap.invoiceNo] || '').trim() : '';
        const rawTotal = statementColMap.totalAmount !== -1 ? cleanNumber(row[statementColMap.totalAmount]) : 0;
        const rawRec = statementColMap.received !== -1 ? cleanNumber(row[statementColMap.received]) : 0;
        const rawRecBal = statementColMap.receivableBalance !== -1 ? cleanNumber(row[statementColMap.receivableBalance]) : 0;
        const rawPayBal = statementColMap.payableBalance !== -1 ? cleanNumber(row[statementColMap.payableBalance]) : 0;
        const rawPayType = statementColMap.paymentType !== -1 ? String(row[statementColMap.paymentType] || '').trim() : 'Cash';
        const rawPayRef = statementColMap.paymentRef !== -1 ? String(row[statementColMap.paymentRef] || '').trim() : '';
        const rawDesc = statementColMap.description !== -1 ? String(row[statementColMap.description] || '').trim() : '';
        const rawPhone = statementColMap.phone !== -1 ? String(row[statementColMap.phone] || '').replace(/[^0-9]/g, '').trim() : '';
        const rawEmail = statementColMap.email !== -1 ? String(row[statementColMap.email] || '').trim() : '';

        // Skip total / summary row
        if (
          !rawParty ||
          rawParty.toLowerCase().startsWith('total') ||
          rawParty.toLowerCase().startsWith('grand total') ||
          rawDate.toLowerCase().startsWith('total')
        ) {
          continue;
        }

        if (!rawDate && !rawTotal && !rawRec && !rawRecBal) {
          continue;
        }

        const normPName = normalizeStr(rawParty);

        // 1. Party Registration & Matching
        if (!detectedPartiesMap.has(normPName)) {
          let matchedShop = null;
          if (rawPhone && existingShopsByPhone.has(rawPhone)) {
            matchedShop = existingShopsByPhone.get(rawPhone);
          } else if (existingShopsByName.has(normPName)) {
            matchedShop = existingShopsByName.get(normPName);
          }

          const partyObj = {
            id: matchedShop ? matchedShop.id : `shop-hist-${Date.now()}-${detectedPartiesMap.size + 1}`,
            name: rawParty,
            owner: matchedShop?.owner || rawParty,
            phone: rawPhone || matchedShop?.mobile || '',
            mobile: rawPhone || matchedShop?.mobile || '',
            email: rawEmail || matchedShop?.email || '',
            address: matchedShop?.address || `${selectedMarket?.name || 'Main Market'} Road`,
            marketId: selectedMarketId,
            marketName: selectedMarket?.name || 'Market',
            routeId: selectedMarket?.routeId || '',
            openingReceivable: rawRecBal > 0 && rawTotal === 0 && rawRec === 0 ? rawRecBal : 0,
            openingPayable: rawPayBal > 0 ? rawPayBal : 0,
            isNew: !matchedShop,
            existingShopId: matchedShop ? matchedShop.id : null,
            source: 'OLD_IMPORT',
            isHistorical: true,
          };
          detectedPartiesMap.set(normPName, partyObj);
        }

        const currentParty = detectedPartiesMap.get(normPName);

        // 2. Classify Transaction Type
        const txnType = classifyTxnType(rawType, rawTotal, rawRec, rawDesc);

        if (txnType === 'OPENING') {
          const opBal = rawRecBal || rawTotal || rawRec;
          currentParty.openingReceivable = opBal;
          detectedOpeningsList.push({
            partyName: rawParty,
            shopId: currentParty.id,
            receivable: opBal,
            payable: rawPayBal,
            date: rawDate || getFormattedDate(),
          });
        } else if (txnType === 'SALE') {
          const billNo = rawInv || `HIST-INV-${r}-${Date.now()}`;
          const saleKey = `${normPName}_${billNo.trim()}_${rawDate}`;
          const isDuplicate = existingOrderKeys.has(saleKey);

          const linkedItems = itemsByInvoiceMap.get(billNo.toLowerCase().trim()) || [];
          const totalKgFromItems = linkedItems.reduce((sum, it) => sum + (it.quantityKg || 0), 0);
          const computedSubtotal = rawTotal || linkedItems.reduce((sum, it) => sum + (it.amount || 0), 0);

          const orderRecord = {
            id: `HIST-ORD-${billNo}-${Date.now()}-${r}`,
            invoiceNo: billNo,
            invoiceRef: billNo,
            billNo,
            shopId: currentParty.id,
            shopName: rawParty,
            marketId: selectedMarketId,
            marketName: selectedMarket?.name || 'Market',
            date: rawDate || getFormattedDate(),
            time: '10:00 AM',
            totalKg: totalKgFromItems,
            totalPouches: 0,
            subtotal: computedSubtotal,
            grandTotal: computedSubtotal,
            items: linkedItems.length > 0 ? linkedItems : [
              {
                productName: rawDesc || 'Historical Order Sale',
                quantityKg: totalKgFromItems,
                quantity: totalKgFromItems,
                unit: 'KG',
                unitPrice: computedSubtotal,
                sellingPrice: computedSubtotal,
                subtotal: computedSubtotal,
                amount: computedSubtotal,
              },
            ],
            remark: rawDesc || 'Historical Business Import',
            source: 'OLD_IMPORT',
            dataSource: 'OLD IMPORT',
            isHistorical: true,
            isDuplicate,
          };
          detectedOrdersList.push(orderRecord);
        } else if (txnType === 'COLLECTION') {
          const refNo = rawPayRef || rawInv || `HIST-RCP-${r}`;
          const colKey = `${normPName}_${rawDate}_${rawRec}`;
          const isDuplicate = existingCollectionKeys.has(colKey);

          const collectionRecord = {
            id: `HIST-COL-${refNo}-${Date.now()}-${r}`,
            receiptNumber: refNo,
            refNo,
            invoiceRef: rawInv || '',
            shopId: currentParty.id,
            shopName: rawParty,
            marketId: selectedMarketId,
            marketName: selectedMarket?.name || 'Market',
            date: rawDate || getFormattedDate(),
            time: '11:00 AM',
            amount: rawRec,
            paymentMode: rawPayType || 'Cash',
            description: rawDesc || 'Historical Payment-In Received',
            remark: rawDesc || 'Historical Payment-In Received',
            source: 'OLD_IMPORT',
            dataSource: 'OLD IMPORT',
            isHistorical: true,
            isDuplicate,
          };
          detectedCollectionsList.push(collectionRecord);
        } else if (txnType === 'RETURN') {
          const retNo = rawInv || `HIST-RET-${r}`;
          const retKey = `${normPName}_${retNo.trim()}_${rawDate}`;
          const isDuplicate = existingReturnKeys.has(retKey);

          const returnRecord = {
            id: `HIST-RET-${retNo}-${Date.now()}-${r}`,
            invoiceNo: retNo,
            invoiceRef: retNo,
            shopId: currentParty.id,
            shopName: rawParty,
            marketId: selectedMarketId,
            marketName: selectedMarket?.name || 'Market',
            date: rawDate || getFormattedDate(),
            time: '12:00 PM',
            productName: rawDesc || 'Historical Credit Note / Return',
            quantityKg: 0,
            returnValue: rawTotal || rawRec,
            amount: rawTotal || rawRec,
            reason: rawDesc || 'Historical Sales Return',
            isCreditNote: true,
            source: 'OLD_IMPORT',
            dataSource: 'OLD IMPORT',
            isHistorical: true,
            isDuplicate,
          };
          detectedReturnsList.push(returnRecord);
        }
      }

      // Compute Summary Metrics
      const partiesArr = Array.from(detectedPartiesMap.values());
      const newPartiesCount = partiesArr.filter((p) => p.isNew).length;
      const existingPartiesCount = partiesArr.filter((p) => !p.isNew).length;
      const duplicatesCount =
        detectedOrdersList.filter((o) => o.isDuplicate).length +
        detectedCollectionsList.filter((c) => c.isDuplicate).length +
        detectedReturnsList.filter((r) => r.isDuplicate).length;

      setParsedPreviewData({
        summary: {
          totalRows: stmtRows.length + itemRows.length,
          newPartiesCount,
          existingPartiesCount,
          salesCount: detectedOrdersList.length,
          itemsCount: detectedItemsList.length,
          collectionsCount: detectedCollectionsList.length,
          returnsCount: detectedReturnsList.length,
          openingBalancesCount: detectedOpeningsList.length,
          duplicatesCount,
          errorsCount: errorRowsList.length,
        },
        detectedParties: partiesArr,
        detectedOrders: detectedOrdersList,
        detectedItems: detectedItemsList,
        detectedCollections: detectedCollectionsList,
        detectedReturns: detectedReturnsList,
        detectedOpenings: detectedOpeningsList,
        errorRows: errorRowsList,
      });

      setIsParsing(false);
      setWizardStep(3); // Go to Preview & Confirm
    } catch (err) {
      console.error('Analysis error:', err);
      setParsingError(`Analysis error: ${err?.message || 'Unknown processing fault'}`);
      setIsParsing(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 3. EXECUTE IMPORT (CONFIRMATION STEP)
  // ──────────────────────────────────────────────────────────────────────────
  const executeHistoricalImport = () => {
    setIsParsing(true);

    try {
      const {
        detectedParties,
        detectedOrders,
        detectedCollections,
        detectedReturns,
        detectedItems,
        errorRows,
      } = parsedPreviewData;

      // Filter out duplicate records to prevent double-counting
      const nonDuplicateOrders = detectedOrders.filter((o) => !o.isDuplicate);
      const nonDuplicateCollections = detectedCollections.filter((c) => !c.isDuplicate);
      const nonDuplicateReturns = detectedReturns.filter((r) => !r.isDuplicate);

      const batchMeta = {
        fileName,
        sheetNames: sheetNamesList,
        itemsCount: detectedItems.length,
      };

      importHistoricalBusinessData({
        newShops: detectedParties.filter((p) => p.isNew),
        historicalOrders: nonDuplicateOrders,
        historicalCollections: nonDuplicateCollections,
        historicalReturns: nonDuplicateReturns,
        batchMeta,
      });

      setIsParsing(false);
      setWizardStep(4); // Success screen
    } catch (err) {
      console.error('Import execution failed:', err);
      alert(`Import failed: ${err?.message || 'Please check your connection and try again.'}`);
      setIsParsing(false);
    }
  };

  // Download Rejected / Error Rows CSV
  const downloadErrorReportCsv = () => {
    if (parsedPreviewData.errorRows.length === 0) {
      alert('No error rows detected in this import batch.');
      return;
    }

    const headers = ['Row Number', 'Sheet Name', 'Party Name', 'Invoice No', 'Rejection Reason'];
    const rows = parsedPreviewData.errorRows.map((err) => [
      err.rowIdx,
      err.sheet,
      err.partyName || 'N/A',
      err.invoiceNo || 'N/A',
      err.reason,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Historical_Import_Errors_${getFormattedDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset Wizard Modal
  const handleCloseWizard = () => {
    setIsWizardOpen(false);
    setWizardStep(1);
    setFile(null);
    setFileName('');
    setParsingError('');
  };

  // ──────────────────────────────────────────────────────────────────────────
  // FILTERED DATA FOR MAIN TABS
  // ──────────────────────────────────────────────────────────────────────────
  const filteredShopsList = useMemo(() => {
    return historicalShops.filter((s) => {
      if (filterMarket !== 'ALL' && s.marketId !== filterMarket && s.marketName !== filterMarket) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (s.name || '').toLowerCase().includes(q);
        const matchPhone = (s.mobile || '').includes(q);
        const matchOwner = (s.owner || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchOwner) return false;
      }
      return true;
    });
  }, [historicalShops, filterMarket, searchQuery]);

  const filteredOrdersList = useMemo(() => {
    return historicalOrders.filter((o) => {
      if (filterMarket !== 'ALL' && o.marketId !== filterMarket && o.marketName !== filterMarket) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchParty = (o.shopName || '').toLowerCase().includes(q);
        const matchInv = (o.invoiceNo || o.billNo || '').toLowerCase().includes(q);
        if (!matchParty && !matchInv) return false;
      }
      return true;
    });
  }, [historicalOrders, filterMarket, searchQuery]);

  const filteredItemsList = useMemo(() => {
    return historicalSaleItems.filter((it) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchItem = (it.itemName || '').toLowerCase().includes(q);
        const matchParty = (it.partyName || '').toLowerCase().includes(q);
        const matchBill = (it.billNo || '').toLowerCase().includes(q);
        if (!matchItem && !matchParty && !matchBill) return false;
      }
      return true;
    });
  }, [historicalSaleItems, searchQuery]);

  const filteredCollectionsList = useMemo(() => {
    return historicalCollections.filter((c) => {
      if (filterMarket !== 'ALL' && c.marketId !== filterMarket && c.marketName !== filterMarket) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchParty = (c.shopName || '').toLowerCase().includes(q);
        const matchRef = (c.receiptNumber || c.refNo || '').toLowerCase().includes(q);
        if (!matchParty && !matchRef) return false;
      }
      return true;
    });
  }, [historicalCollections, filterMarket, searchQuery]);

  const filteredReturnsList = useMemo(() => {
    return historicalReturns.filter((r) => {
      if (filterMarket !== 'ALL' && r.marketId !== filterMarket && r.marketName !== filterMarket) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchParty = (r.shopName || '').toLowerCase().includes(q);
        const matchInv = (r.invoiceNo || '').toLowerCase().includes(q);
        if (!matchParty && !matchInv) return false;
      }
      return true;
    });
  }, [historicalReturns, filterMarket, searchQuery]);

  // Total Historical Financial Summaries
  const totalHistoricalSalesValue = historicalOrders.reduce((sum, o) => sum + Number(o.grandTotal || o.subtotal || 0), 0);
  const totalHistoricalSalesKg = historicalOrders.reduce((sum, o) => sum + Number(o.totalKg || 0), 0);
  const totalHistoricalCollected = historicalCollections.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const totalHistoricalReturned = historicalReturns.reduce((sum, r) => sum + Number(r.returnValue || r.amount || 0), 0);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: MAIN PAGE TABS
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 text-white p-6 rounded-3xl shadow-xl border border-red-900/40 relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase tracking-widest">
                ADMIN ONLY
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/10 text-slate-300">
                COMPLETE REWORK
              </span>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white mt-2 flex items-center gap-2.5">
              <UploadCloud className="w-8 h-8 text-amber-400" />
              <span>HISTORICAL DATA IMPORT</span>
            </h1>
            <p className="text-xs text-slate-300 font-medium max-w-2xl mt-1">
              Import entire beginning-to-present sales, item-wise billing, payment receipts, returns, and opening balances linked cleanly to Markets.
            </p>
          </div>

          <button
            onClick={() => {
              setWizardStep(1);
              setIsWizardOpen(true);
            }}
            className="py-3 px-6 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 rounded-2xl font-black text-sm shadow-xl flex items-center gap-2 transform active:scale-95 transition-all flex-shrink-0"
          >
            <UploadCloud className="w-5 h-5 fill-slate-950" />
            <span>UPLOAD EXCEL / CSV</span>
          </button>
        </div>

        {/* Financial KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <p className="text-slate-400 font-bold uppercase text-[10px]">Imported Parties</p>
            <p className="text-xl font-black text-white mt-0.5">{historicalShops.length} Parties</p>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <p className="text-slate-400 font-bold uppercase text-[10px]">Historical Sales</p>
            <p className="text-xl font-black text-amber-300 mt-0.5">
              ₹{totalHistoricalSalesValue.toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-slate-400">{totalHistoricalSalesKg.toLocaleString('en-IN')} KG • {historicalOrders.length} Bills</p>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <p className="text-slate-400 font-bold uppercase text-[10px]">Historical Payments</p>
            <p className="text-xl font-black text-emerald-400 mt-0.5">
              ₹{totalHistoricalCollected.toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-slate-400">{historicalCollections.length} Receipts</p>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <p className="text-slate-400 font-bold uppercase text-[10px]">Historical Returns</p>
            <p className="text-xl font-black text-red-400 mt-0.5">
              ₹{totalHistoricalReturned.toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-slate-400">{historicalReturns.length} Credit Notes</p>
          </div>
        </div>
      </div>

      {/* 2. Main Tab Navigation (8 Specific Sections Requested) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {[
          { id: 'parties', label: '1. Party / Shop Master', count: historicalShops.length, icon: Store },
          { id: 'sales', label: '2. Sales / Billing', count: historicalOrders.length, icon: ShoppingBag },
          { id: 'items', label: '3. Item-wise Sales', count: historicalSaleItems.length, icon: Layers },
          { id: 'collections', label: '4. Collection / Payment', count: historicalCollections.length, icon: IndianRupee },
          { id: 'returns', label: '5. Return History', count: historicalReturns.length, icon: RotateCcw },
          { id: 'opening', label: '6. Opening Balances', count: historicalShops.filter((s) => s.openingReceivable > 0).length, icon: Clock },
          { id: 'history', label: '7. Import History', count: importBatches.length, icon: FileSpreadsheet },
          { id: 'errors', label: '8. Error / Rejected Rows', count: parsedPreviewData.errorRows.length, icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-3.5 rounded-xl font-black text-xs whitespace-nowrap flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-slate-950 text-amber-400 shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search party, invoice, or item..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase">Market:</span>
          <select
            value={filterMarket}
            onChange={(e) => setFilterMarket(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
          >
            <option value="ALL">All Markets</option>
            {markets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Tab Content Views */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* TAB 1: PARTY / SHOP MASTER */}
        {activeTab === 'parties' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black">
                <tr>
                  <th className="p-3.5">Party / Shop Name</th>
                  <th className="p-3.5">Market</th>
                  <th className="p-3.5">Mobile / Phone</th>
                  <th className="p-3.5 text-right">Opening Rec.</th>
                  <th className="p-3.5 text-right">Opening Pay.</th>
                  <th className="p-3.5 text-right">Current Outstanding</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredShopsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                      No historical parties found. Upload an Excel file to import.
                    </td>
                  </tr>
                ) : (
                  filteredShopsList.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <Store className="w-4 h-4 text-red-700 flex-shrink-0" />
                        <div>
                          <span>{s.name}</span>
                          <span className="block text-[10px] text-slate-400 font-normal">{s.owner || s.address}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-bold text-slate-800">
                          {s.marketName || s.marketId}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600">{s.mobile || s.phone || '—'}</td>
                      <td className="p-3.5 text-right font-bold text-slate-800">
                        ₹{(s.openingReceivable || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-800">
                        ₹{(s.openingPayable || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-right font-black text-red-700">
                        ₹{(s.outstanding || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                          HISTORICAL
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: SALES / BILLING */}
        {activeTab === 'sales' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black">
                <tr>
                  <th className="p-3.5">Bill / Invoice No.</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Party Name</th>
                  <th className="p-3.5">Market</th>
                  <th className="p-3.5 text-right">Total KG</th>
                  <th className="p-3.5 text-right">Bill Total (₹)</th>
                  <th className="p-3.5 text-center">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredOrdersList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                      No historical sales bills found.
                    </td>
                  </tr>
                ) : (
                  filteredOrdersList.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-700" />
                        <span>{o.invoiceNo || o.billNo || o.id}</span>
                      </td>
                      <td className="p-3.5 text-slate-600">{o.date}</td>
                      <td className="p-3.5 font-bold text-slate-800">{o.shopName}</td>
                      <td className="p-3.5 text-slate-600">{o.marketName || '—'}</td>
                      <td className="p-3.5 text-right font-bold text-slate-700">{o.totalKg || 0} KG</td>
                      <td className="p-3.5 text-right font-black text-slate-900">
                        ₹{(o.grandTotal || o.subtotal || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                          HISTORICAL
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: ITEM-WISE SALES */}
        {activeTab === 'items' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black">
                <tr>
                  <th className="p-3.5">Bill No.</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Party Name</th>
                  <th className="p-3.5">Item Name</th>
                  <th className="p-3.5">Item Code / HSN</th>
                  <th className="p-3.5 text-right">Quantity</th>
                  <th className="p-3.5 text-right">Unit Price</th>
                  <th className="p-3.5 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredItemsList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                      No item-wise sales history available.
                    </td>
                  </tr>
                ) : (
                  filteredItemsList.slice(0, 300).map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-800">{it.billNo}</td>
                      <td className="p-3.5 text-slate-600">{it.date}</td>
                      <td className="p-3.5 font-bold text-slate-900">{it.partyName}</td>
                      <td className="p-3.5 font-bold text-amber-900">{it.itemName}</td>
                      <td className="p-3.5 text-slate-500 text-[11px]">{it.itemCode || it.hsn || '—'}</td>
                      <td className="p-3.5 text-right font-bold text-slate-800">
                        {it.quantity} {it.unit}
                      </td>
                      <td className="p-3.5 text-right text-slate-600">₹{it.unitPrice}</td>
                      <td className="p-3.5 text-right font-black text-slate-900">
                        ₹{Number(it.amount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: COLLECTION / PAYMENT */}
        {activeTab === 'collections' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black">
                <tr>
                  <th className="p-3.5">Receipt / Ref No.</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Party Name</th>
                  <th className="p-3.5">Mode</th>
                  <th className="p-3.5 text-right">Amount (₹)</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCollectionsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                      No historical collection/payment records found.
                    </td>
                  </tr>
                ) : (
                  filteredCollectionsList.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-emerald-950 flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{c.receiptNumber || c.refNo || c.id}</span>
                      </td>
                      <td className="p-3.5 text-slate-600">{c.date}</td>
                      <td className="p-3.5 font-bold text-slate-900">{c.shopName}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 rounded font-bold text-[11px] border border-emerald-200">
                          {c.paymentMode || 'Cash'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-black text-emerald-700">
                        ₹{Number(c.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">{c.description || c.remark || '—'}</td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200">
                          PAID
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: RETURN HISTORY */}
        {activeTab === 'returns' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black">
                <tr>
                  <th className="p-3.5">Invoice / CN No.</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Party Name</th>
                  <th className="p-3.5">Product Name</th>
                  <th className="p-3.5 text-right">Return Value (₹)</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5 text-center">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredReturnsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                      No historical returns or credit notes recorded.
                    </td>
                  </tr>
                ) : (
                  filteredReturnsList.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-red-950 flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-red-700" />
                        <span>{r.invoiceNo || r.id}</span>
                      </td>
                      <td className="p-3.5 text-slate-600">{r.date}</td>
                      <td className="p-3.5 font-bold text-slate-900">{r.shopName}</td>
                      <td className="p-3.5 font-semibold text-slate-700">{r.productName || 'Credit Note'}</td>
                      <td className="p-3.5 text-right font-black text-red-700">
                        ₹{Number(r.returnValue || r.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">{r.reason || '—'}</td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-900 border border-red-200">
                          CREDIT NOTE
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: OPENING BALANCES */}
        {activeTab === 'opening' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black">
                <tr>
                  <th className="p-3.5">Party Name</th>
                  <th className="p-3.5">Market</th>
                  <th className="p-3.5 text-right">Opening Receivable (Dr)</th>
                  <th className="p-3.5 text-right">Opening Payable (Cr)</th>
                  <th className="p-3.5">Formula Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {historicalShops.filter((s) => (s.openingReceivable || 0) > 0 || (s.openingPayable || 0) > 0).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                      No initial opening balances recorded for imported parties.
                    </td>
                  </tr>
                ) : (
                  historicalShops
                    .filter((s) => (s.openingReceivable || 0) > 0 || (s.openingPayable || 0) > 0)
                    .map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{s.name}</td>
                        <td className="p-3.5 text-slate-600">{s.marketName}</td>
                        <td className="p-3.5 text-right font-black text-slate-900">
                          ₹{(s.openingReceivable || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-600">
                          ₹{(s.openingPayable || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3.5 text-slate-500 text-[11px]">
                          Opening Balance + Sales - Collections - Returns = Current Receivable
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 7: IMPORT HISTORY */}
        {activeTab === 'history' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black">
                <tr>
                  <th className="p-3.5">Import Date & Time</th>
                  <th className="p-3.5">File Name</th>
                  <th className="p-3.5">Market</th>
                  <th className="p-3.5">Imported By</th>
                  <th className="p-3.5 text-right">New Parties</th>
                  <th className="p-3.5 text-right">Bills / Items</th>
                  <th className="p-3.5 text-right">Collections</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {importBatches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                      No historical import batches recorded yet.
                    </td>
                  </tr>
                ) : (
                  importBatches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">{b.importedAt || b.importDate || '—'}</td>
                      <td className="p-3.5 font-semibold text-slate-800">{b.fileName || 'Excel_Batch.xlsx'}</td>
                      <td className="p-3.5 text-slate-600">{b.marketName || '—'}</td>
                      <td className="p-3.5 text-slate-600">{b.importedBy || 'Admin'}</td>
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        {b.counts?.newShops ?? b.newParties ?? 0}
                      </td>
                      <td className="p-3.5 text-right font-bold text-amber-900">
                        {b.counts?.orders ?? 0} bills ({b.counts?.itemsCount ?? 0} items)
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-900">
                        {b.counts?.collections ?? 0} receipts
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200">
                          {b.status || 'Completed'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 8: ERROR / REJECTED ROWS */}
        {activeTab === 'errors' && (
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-900 text-sm uppercase">Rejected & Invalid Rows Log</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Review lines that were skipped or rejected during Excel processing with exact failure reasons.
                </p>
              </div>

              {parsedPreviewData.errorRows.length > 0 && (
                <button
                  onClick={downloadErrorReportCsv}
                  className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Error Report (CSV)</span>
                </button>
              )}
            </div>

            {parsedPreviewData.errorRows.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-2xl text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-emerald-900">Zero Error Rows Detected</p>
                <p className="text-xs text-emerald-700 mt-1">All parsed data matched requirements seamlessly.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black">
                    <tr>
                      <th className="p-3">Row #</th>
                      <th className="p-3">Sheet</th>
                      <th className="p-3">Party Name</th>
                      <th className="p-3">Invoice / Ref</th>
                      <th className="p-3">Rejection Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedPreviewData.errorRows.map((err, idx) => (
                      <tr key={idx} className="hover:bg-red-50/50">
                        <td className="p-3 font-bold text-slate-900">{err.rowIdx}</td>
                        <td className="p-3 text-slate-600">{err.sheet}</td>
                        <td className="p-3 font-bold text-slate-800">{err.partyName || '—'}</td>
                        <td className="p-3 text-slate-600">{err.invoiceNo || '—'}</td>
                        <td className="p-3 font-bold text-red-700">{err.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 5. UPLOAD & PREVIEW WIZARD MODAL */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 text-white p-5 relative flex-shrink-0 flex justify-between items-center border-b border-red-900/40">
              <div>
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                  STEP {wizardStep} OF 4 • COMPLETE IMPORT SYSTEM
                </p>
                <h2 className="text-xl font-black mt-0.5">HISTORICAL DATA IMPORT WIZARD</h2>
              </div>
              <button
                onClick={handleCloseWizard}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body per Step */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* STEP 1: SELECT MARKET & UPLOAD EXCEL */}
              {wizardStep === 1 && (
                <div className="space-y-6">
                  {/* Step 1.1: Mandatory Market Selection */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-red-700" />
                      <span>STEP 1 – SELECT MANDATORY TARGET MARKET *</span>
                    </label>
                    <p className="text-xs text-slate-500 font-medium">
                      Every imported party and bill will link to this market. Marketers assigned to this market will automatically see their parties.
                    </p>
                    <select
                      value={selectedMarketId}
                      onChange={(e) => setSelectedMarketId(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border-2 border-slate-300 focus:border-red-600 rounded-2xl text-sm font-bold text-slate-900"
                    >
                      <option value="">-- Choose Market (e.g. Akodiya, Pachore, Ashta, etc.) --</option>
                      {markets.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.group ? `(${m.group})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Step 1.2: File Upload Zone */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                      <span>STEP 2 – SELECT EXCEL (.XLSX / .XLS) OR CSV FILE *</span>
                    </label>

                    <label
                      className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                        selectedMarketId
                          ? 'border-red-400 bg-red-50/30 hover:bg-red-50/60'
                          : 'border-slate-300 bg-slate-100 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        disabled={!selectedMarketId}
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <UploadCloud className="w-12 h-12 text-red-700 mb-2 animate-pulse" />
                      <p className="font-black text-slate-900 text-sm">
                        {fileName ? fileName : 'Click or Drag Excel File Here'}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Supports multi-sheet workbooks (e.g. <em>Party Statement Report</em> & <em>Item Details</em>)
                      </p>
                    </label>
                  </div>

                  {isParsing && (
                    <div className="flex items-center justify-center gap-3 p-4 bg-slate-100 rounded-2xl text-slate-700 font-bold text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-red-700" />
                      <span>Reading and parsing multi-sheet workbook structure...</span>
                    </div>
                  )}

                  {parsingError && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{parsingError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: COLUMN MAPPING REVIEW */}
              {wizardStep === 2 && (
                <div className="space-y-5">
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-950 font-medium">
                    <p className="font-bold text-amber-900 uppercase">Multi-Sheet Structure Detected</p>
                    <p className="mt-0.5">
                      File: <strong>{fileName}</strong> • Market: <strong>{selectedMarket?.name}</strong> • Sheets: {sheetNamesList.join(', ')}
                    </p>
                  </div>

                  {/* Mapping 1: Statement Sheet */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-black text-slate-900 text-xs uppercase flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-red-700" />
                        <span>Sheet 1: Party Statement Column Mapping ({statementSheetName})</span>
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Party Name Column *</label>
                        <select
                          value={statementColMap.partyName}
                          onChange={(e) => setStatementColMap({ ...statementColMap, partyName: Number(e.target.value) })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          <option value={-1}>-- Select Column --</option>
                          {(rawSheets[statementSheetName]?.[0] || []).map((col, idx) => (
                            <option key={idx} value={idx}>
                              Col {idx + 1}: {col || `Column ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Invoice / Bill No Column</label>
                        <select
                          value={statementColMap.invoiceNo}
                          onChange={(e) => setStatementColMap({ ...statementColMap, invoiceNo: Number(e.target.value) })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          <option value={-1}>-- Select Column --</option>
                          {(rawSheets[statementSheetName]?.[0] || []).map((col, idx) => (
                            <option key={idx} value={idx}>
                              Col {idx + 1}: {col || `Column ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Date Column</label>
                        <select
                          value={statementColMap.date}
                          onChange={(e) => setStatementColMap({ ...statementColMap, date: Number(e.target.value) })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          <option value={-1}>-- Select Column --</option>
                          {(rawSheets[statementSheetName]?.[0] || []).map((col, idx) => (
                            <option key={idx} value={idx}>
                              Col {idx + 1}: {col || `Column ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Sale / Total Amount Column</label>
                        <select
                          value={statementColMap.totalAmount}
                          onChange={(e) => setStatementColMap({ ...statementColMap, totalAmount: Number(e.target.value) })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          <option value={-1}>-- Select Column --</option>
                          {(rawSheets[statementSheetName]?.[0] || []).map((col, idx) => (
                            <option key={idx} value={idx}>
                              Col {idx + 1}: {col || `Column ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Received / Payment Column</label>
                        <select
                          value={statementColMap.received}
                          onChange={(e) => setStatementColMap({ ...statementColMap, received: Number(e.target.value) })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          <option value={-1}>-- Select Column --</option>
                          {(rawSheets[statementSheetName]?.[0] || []).map((col, idx) => (
                            <option key={idx} value={idx}>
                              Col {idx + 1}: {col || `Column ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Receivable Balance (Ref)</label>
                        <select
                          value={statementColMap.receivableBalance}
                          onChange={(e) => setStatementColMap({ ...statementColMap, receivableBalance: Number(e.target.value) })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          <option value={-1}>-- Select Column --</option>
                          {(rawSheets[statementSheetName]?.[0] || []).map((col, idx) => (
                            <option key={idx} value={idx}>
                              Col {idx + 1}: {col || `Column ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Mapping 2: Item Details Sheet (if present) */}
                  {itemsSheetName && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="font-black text-slate-900 text-xs uppercase flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-amber-700" />
                          <span>Sheet 2: Item Details Column Mapping ({itemsSheetName})</span>
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="font-bold text-slate-600 block mb-1">Item Name Column *</label>
                          <select
                            value={itemColMap.itemName}
                            onChange={(e) => setItemColMap({ ...itemColMap, itemName: Number(e.target.value) })}
                            className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                          >
                            <option value={-1}>-- Select Column --</option>
                            {(rawSheets[itemsSheetName]?.[0] || []).map((col, idx) => (
                              <option key={idx} value={idx}>
                                Col {idx + 1}: {col || `Column ${idx + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-bold text-slate-600 block mb-1">Quantity (KG) Column</label>
                          <select
                            value={itemColMap.quantity}
                            onChange={(e) => setItemColMap({ ...itemColMap, quantity: Number(e.target.value) })}
                            className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                          >
                            <option value={-1}>-- Select Column --</option>
                            {(rawSheets[itemsSheetName]?.[0] || []).map((col, idx) => (
                              <option key={idx} value={idx}>
                                Col {idx + 1}: {col || `Column ${idx + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-bold text-slate-600 block mb-1">Item Amount Column</label>
                          <select
                            value={itemColMap.amount}
                            onChange={(e) => setItemColMap({ ...itemColMap, amount: Number(e.target.value) })}
                            className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                          >
                            <option value={-1}>-- Select Column --</option>
                            {(rawSheets[itemsSheetName]?.[0] || []).map((col, idx) => (
                              <option key={idx} value={idx}>
                                Col {idx + 1}: {col || `Column ${idx + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => setWizardStep(1)}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs"
                    >
                      ← Back to Upload
                    </button>
                    <button
                      onClick={processAndAnalyzeExcel}
                      className="py-2.5 px-5 bg-gradient-to-r from-red-700 to-amber-700 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                    >
                      <span>Analyze & Preview Records →</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PREVIEW BEFORE IMPORT */}
              {wizardStep === 3 && (
                <div className="space-y-5">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <p className="text-[10px] font-black text-slate-500 uppercase">Parties Detected</p>
                      <p className="text-xl font-black text-slate-900 mt-0.5">
                        {parsedPreviewData.detectedParties.length}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold">
                        {parsedPreviewData.summary.newPartiesCount} New • {parsedPreviewData.summary.existingPartiesCount} Existing
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <p className="text-[10px] font-black text-slate-500 uppercase">Sales Bills</p>
                      <p className="text-xl font-black text-amber-700 mt-0.5">
                        {parsedPreviewData.summary.salesCount}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold">
                        {parsedPreviewData.summary.itemsCount} Line Items Linked
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <p className="text-[10px] font-black text-slate-500 uppercase">Payment Receipts</p>
                      <p className="text-xl font-black text-emerald-700 mt-0.5">
                        {parsedPreviewData.summary.collectionsCount}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold">
                        {parsedPreviewData.summary.returnsCount} Returns / Credit Notes
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <p className="text-[10px] font-black text-slate-500 uppercase">Duplicates & Errors</p>
                      <p className="text-xl font-black text-red-700 mt-0.5">
                        {parsedPreviewData.summary.duplicatesCount}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold">
                        {parsedPreviewData.summary.errorsCount} Rejected Rows
                      </p>
                    </div>
                  </div>

                  {/* Preview Table of Detected Parties */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="bg-slate-100 p-3 border-b border-slate-200 font-black text-xs text-slate-800 uppercase flex justify-between items-center">
                      <span>Detected Parties Sample ({parsedPreviewData.detectedParties.length})</span>
                      <span className="text-[10px] text-slate-500 font-bold">Linked to {selectedMarket?.name}</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-black">
                          <tr>
                            <th className="p-2.5">Party Name</th>
                            <th className="p-2.5">Phone</th>
                            <th className="p-2.5">Match Status</th>
                            <th className="p-2.5 text-right">Opening Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedPreviewData.detectedParties.slice(0, 15).map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-slate-900">{p.name}</td>
                              <td className="p-2.5 text-slate-600">{p.phone || '—'}</td>
                              <td className="p-2.5">
                                {p.isNew ? (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-black text-[10px]">
                                    NEW PARTY
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-black text-[10px]">
                                    MATCHED EXISTING
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-black text-slate-900">
                                ₹{p.openingReceivable.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => setWizardStep(2)}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs"
                    >
                      ← Back to Mapping
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCloseWizard}
                        className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={executeHistoricalImport}
                        className="py-2.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm & Execute Import</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: SUCCESS CONFIRMATION */}
              {wizardStep === 4 && (
                <div className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase">
                    Historical Data Import Completed Successfully!
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto font-medium">
                    All historical bills, items, collections, returns, and opening balances have been imported into the accounting system and synced to Firebase Cloud.
                  </p>

                  <div className="pt-4 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        handleCloseWizard();
                        setActiveTab('sales');
                      }}
                      className="py-3 px-6 bg-slate-950 hover:bg-slate-900 text-amber-300 rounded-2xl font-black text-xs shadow-md"
                    >
                      View Imported Sales Bills →
                    </button>
                    <button
                      onClick={() => {
                        handleCloseWizard();
                        setActiveTab('parties');
                      }}
                      className="py-3 px-6 bg-red-700 hover:bg-red-800 text-white rounded-2xl font-black text-xs shadow-md"
                    >
                      View Parties Master →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
