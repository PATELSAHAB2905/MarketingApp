import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';

import {
  isShopMatchingRecord,
  normalizeShopName,
} from '../../utils/partyLedgerHelper';

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
    .replace(/\s*\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Classify Transaction Type
const classifyTxnType = (rawType = '', debitVal = 0, creditVal = 0, desc = '') => {
  const t = String(rawType || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  const d = String(desc || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

  // 1. Opening Balance
  if (
    t.includes('opening') ||
    t.includes('open bal') ||
    t.includes('op bal') ||
    t.includes('initial') ||
    d.includes('opening balance') ||
    d.includes('open bal')
  ) {
    return 'OPENING';
  }

  // 2. Returns / Credit Notes
  if (
    t.includes('return') ||
    t.includes('credit note') ||
    t.includes('cr note') ||
    t === 'cn' ||
    t === 'cr' ||
    d.includes('sales return') ||
    d.includes('credit note') ||
    d.includes('return')
  ) {
    return 'RETURN';
  }

  // 3. Payments / Collections
  if (
    t.includes('payment') ||
    t.includes('receipt') ||
    t.includes('received') ||
    t.includes('collection') ||
    t.includes('pay in') ||
    t.includes('money in') ||
    t.includes('cash in') ||
    t.includes('bank') ||
    t.includes('online') ||
    t.includes('upi') ||
    d.includes('payment') ||
    d.includes('receipt') ||
    d.includes('received') ||
    (creditVal > 0 && debitVal === 0)
  ) {
    return 'COLLECTION';
  }

  // 4. Sales / Invoices
  if (
    t.includes('sale') ||
    t.includes('invoice') ||
    t.includes('bill') ||
    t.includes('tax inv') ||
    t.includes('order') ||
    (debitVal > 0 && creditVal === 0)
  ) {
    return 'SALE';
  }

  // 5. Fallback based on values
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
    addMarket,
    marketers = [],
    shops,
    orders,
    collections,
    returns,
    importBatches = [],
    importHistoricalBusinessData,
    updateShop,
    deleteShop,
    deleteOrder,
    deleteCollection,
    deleteReturn,
    deleteImportBatch,
    getFormattedDate,
    getFormattedTime,
  } = useData();

  // Party Edit & Delete state
  const [editingParty, setEditingParty] = useState(null);
  const [editPartyName, setEditPartyName] = useState('');
  const [editPartyOwner, setEditPartyOwner] = useState('');
  const [editPartyMobile, setEditPartyMobile] = useState('');
  const [editPartyAddress, setEditPartyAddress] = useState('');
  const [editPartyMarketId, setEditPartyMarketId] = useState('');
  const [editPartyOutstanding, setEditPartyOutstanding] = useState('');

  const [deletingParty, setDeletingParty] = useState(null);
  const [deletePartyTransactions, setDeletePartyTransactions] = useState(true);

  const handleOpenEditParty = (party) => {
    setEditingParty(party);
    setEditPartyName(party.name || '');
    setEditPartyOwner(party.owner || '');
    setEditPartyMobile(party.mobile || party.phone || '');
    setEditPartyAddress(party.address || '');
    setEditPartyMarketId(party.marketId || markets[0]?.id || '');
    setEditPartyOutstanding(party.outstanding !== undefined ? String(party.outstanding) : '0');
  };

  const handleSaveEditParty = (e) => {
    e.preventDefault();
    if (!editingParty) return;
    updateShop(editingParty.id, {
      name: editPartyName.trim(),
      owner: editPartyOwner.trim(),
      mobile: editPartyMobile.trim(),
      address: editPartyAddress.trim(),
      marketId: editPartyMarketId,
      outstanding: editPartyOutstanding ? Number(editPartyOutstanding) : 0,
    });
    setEditingParty(null);
  };

  const handleConfirmDeleteParty = () => {
    if (!deletingParty) return;
    deleteShop(deletingParty, deletePartyTransactions);
    setDeletingParty(null);
  };

  // Active Main View Tab
  // 1. master, 2. sales, 3. items, 4. collections, 5. returns, 6. opening, 7. history, 8. errors
  const [activeTab, setActiveTab] = useState('parties'); // 'parties' | 'sales' | 'items' | 'collections' | 'returns' | 'opening' | 'history' | 'errors'

  // Wizard Upload State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1: Market & Upload, 2: Column Mapping, 3: Preview & Confirm, 4: Success
  const [selectedMarketId, setSelectedMarketId] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsingError, setParsingError] = useState('');

  // Quick Add Market State
  const [showAddMarketModal, setShowAddMarketModal] = useState(false);
  const [newMarketName, setNewMarketName] = useState('');
  const [newMarketDistrict, setNewMarketDistrict] = useState('Shajapur');
  const [newMarketMarketerId, setNewMarketMarketerId] = useState('');
  const [newMarketDistanceKm, setNewMarketDistanceKm] = useState(50);
  const [newMarketFuelRate, setNewMarketFuelRate] = useState(2);
  const [marketActionMsg, setMarketActionMsg] = useState('');
  const [newMarketError, setNewMarketError] = useState('');

  const handleCreateMarket = (e) => {
    if (e) e.preventDefault();
    if (!newMarketName.trim()) {
      setNewMarketError('Please enter a market name.');
      return;
    }
    const created = addMarket({
      name: newMarketName.trim(),
      district: newMarketDistrict.trim() || 'Shajapur',
      assignedMarketerId: newMarketMarketerId || null,
      distanceKm: Number(newMarketDistanceKm) || 50,
      fuelRateKm: Number(newMarketFuelRate) || 2,
    });
    if (created && created.id) {
      setSelectedMarketId(created.id);
      setMarketActionMsg(`Market "${created.name}" created and selected!`);
      setTimeout(() => setMarketActionMsg(''), 4000);
    }
    setNewMarketName('');
    setNewMarketDistrict('Shajapur');
    setNewMarketMarketerId('');
    setNewMarketError('');
    setShowAddMarketModal(false);
  };

  // Single-Party / Default Party Context
  const [selectedTargetShopId, setSelectedTargetShopId] = useState('');
  const [defaultPartyName, setDefaultPartyName] = useState('');
  const [defaultPartyPhone, setDefaultPartyPhone] = useState('');
  const [statementHeaders, setStatementHeaders] = useState([]);
  const [itemHeaders, setItemHeaders] = useState([]);

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

  // Multi-Selection State for Bulk Deletions
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());

  // Clear selection on tab or filter change
  useEffect(() => {
    setSelectedRowIds(new Set());
  }, [activeTab, filterMarket, searchQuery]);

  const handleToggleSelectRow = (id) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllRows = (itemsList = []) => {
    setSelectedRowIds((prev) => {
      const allSelected = itemsList.length > 0 && itemsList.every((it) => prev.has(it.id));
      if (allSelected) {
        return new Set();
      }
      return new Set(itemsList.map((it) => it.id));
    });
  };

  const handleClearSelection = () => {
    setSelectedRowIds(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedRowIds.size === 0) return;
    const count = selectedRowIds.size;
    if (!window.confirm(`Are you sure you want to permanently delete ${count} selected records?`)) return;

    if (activeTab === 'parties') {
      const targetShops = historicalShops.filter((s) => selectedRowIds.has(s.id));
      targetShops.forEach((s) => deleteShop(s, true));
    } else if (activeTab === 'sales') {
      selectedRowIds.forEach((id) => deleteOrder(id));
    } else if (activeTab === 'items') {
      const selectedItems = historicalSaleItems.filter((it) => selectedRowIds.has(it.id));
      const orderIds = new Set(selectedItems.map((it) => it.orderId));
      orderIds.forEach((ordId) => deleteOrder(ordId));
    } else if (activeTab === 'collections') {
      selectedRowIds.forEach((id) => deleteCollection(id));
    } else if (activeTab === 'returns') {
      selectedRowIds.forEach((id) => deleteReturn(id));
    }

    setSelectedRowIds(new Set());
  };

  const handleDeleteAllFiltered = () => {
    let currentListCount = 0;
    if (activeTab === 'parties') currentListCount = filteredShopsList.length;
    else if (activeTab === 'sales') currentListCount = filteredOrdersList.length;
    else if (activeTab === 'items') currentListCount = filteredItemsList.length;
    else if (activeTab === 'collections') currentListCount = filteredCollectionsList.length;
    else if (activeTab === 'returns') currentListCount = filteredReturnsList.length;

    if (currentListCount === 0) return;

    if (
      !window.confirm(
        `Are you sure you want to PERMANENTLY DELETE ALL ${currentListCount} records matching the current filter? This action cannot be undone.`
      )
    ) {
      return;
    }

    if (activeTab === 'parties') {
      filteredShopsList.forEach((s) => deleteShop(s, true));
    } else if (activeTab === 'sales') {
      filteredOrdersList.forEach((o) => deleteOrder(o.id));
    } else if (activeTab === 'items') {
      const orderIds = new Set(filteredItemsList.map((it) => it.orderId));
      orderIds.forEach((ordId) => deleteOrder(ordId));
    } else if (activeTab === 'collections') {
      filteredCollectionsList.forEach((c) => deleteCollection(c.id));
    } else if (activeTab === 'returns') {
      filteredReturnsList.forEach((r) => deleteReturn(r.id));
    }

    setSelectedRowIds(new Set());
  };

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
            marketId: o.marketId,
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
          marketId: o.marketId,
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
          if (sLower.includes('statement') || sLower.includes('party') || sLower.includes('ledger') || sLower.includes('report') || sLower.includes('transaction')) {
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

        // Auto-extract Party metadata from top rows of Statement Sheet
        const stmtRows = sheetsData[detectedStatementSheet] || [];
        let extractedParty = '';
        let extractedPhone = '';

        for (let i = 0; i < Math.min(15, stmtRows.length); i++) {
          const row = stmtRows[i] || [];
          for (let j = 0; j < row.length; j++) {
            const cell = String(row[j] || '').trim();
            if (/^(party\s*name|customer\s*name|account\s*name|party|customer|m\/s)\s*[:=-]/i.test(cell)) {
              const parts = cell.split(/[:=-]/);
              if (parts[1] && parts[1].trim()) {
                extractedParty = parts[1].trim();
              } else if (row[j + 1]) {
                extractedParty = String(row[j + 1]).trim();
              }
            } else if (/^(phone|mobile|contact|tel)\s*[:=-]/i.test(cell)) {
              const parts = cell.split(/[:=-]/);
              if (parts[1] && parts[1].trim()) {
                extractedPhone = parts[1].trim().replace(/[^0-9]/g, '');
              } else if (row[j + 1]) {
                extractedPhone = String(row[j + 1]).trim().replace(/[^0-9]/g, '');
              }
            }
          }
        }

        // Fallback party extraction from Sheet Name or File Name
        if (!extractedParty) {
          const sNameLower = detectedStatementSheet.toLowerCase();
          if (
            !sNameLower.startsWith('sheet') &&
            !sNameLower.includes('statement') &&
            !sNameLower.includes('report') &&
            !sNameLower.includes('transaction')
          ) {
            extractedParty = detectedStatementSheet;
          } else if (uploadedFile.name) {
            const cleanName = uploadedFile.name
              .replace(/\.(xlsx|xls|csv)$/i, '')
              .replace(/party[\s_-]*statement/gi, '')
              .replace(/statement/gi, '')
              .replace(/report/gi, '')
              .replace(/[_-]+/g, ' ')
              .trim();
            if (cleanName && cleanName.length > 2) {
              extractedParty = cleanName;
            }
          }
        }

        setDefaultPartyName(extractedParty);
        setDefaultPartyPhone(extractedPhone);

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

    // Scan up to first 35 rows for actual table header row (must match at least 2 distinct column concepts)
    let headerIdx = 0;
    for (let i = 0; i < Math.min(35, sheetRows.length); i++) {
      const row = (sheetRows[i] || []).map((c) =>
        String(c).toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
      );
      let matches = 0;
      if (row.some((c) => c === 'date' || c.includes('date') || c === 'dt')) matches++;
      if (row.some((c) => c.includes('type') || c.includes('particular') || c.includes('voucher') || c.includes('vch'))) matches++;
      if (row.some((c) => c.includes('ref') || c.includes('invoice') || c.includes('bill') || c.includes('doc'))) matches++;
      if (row.some((c) => c.includes('total') || c.includes('amount') || c.includes('debit') || c.includes('income'))) matches++;
      if (row.some((c) => c.includes('received') || c.includes('paid') || c.includes('credit') || c.includes('payment'))) matches++;
      if (row.some((c) => c.includes('balance') || c.includes('receivable') || c.includes('payable'))) matches++;

      if (matches >= 2) {
        headerIdx = i;
        break;
      }
    }

    const rawHeadersRow = sheetRows[headerIdx] || [];
    setStatementHeaders(rawHeadersRow);
    const headers = rawHeadersRow.map((c) =>
      String(c).toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
    );

    const findCol = (aliases) => {
      return headers.findIndex((h) => {
        if (!h) return false;
        return aliases.some((a) => {
          const cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
          return h === cleanA || h.includes(cleanA) || cleanA.includes(h);
        });
      });
    };

    setStatementColMap({
      date: findCol(['date', 'txn date', 'invoice date', 'bill date', 'entry date', 'dt']),
      txnType: findCol(['txn type', 'transaction type', 'type', 'vch type', 'particulars', 'particular', 'voucher type', 'entry type']),
      invoiceNo: findCol(['invoice ref no', 'invoice ref', 'ref no', 'invoice no', 'bill no', 'vch no', 'ref', 'invoice', 'bill', 'voucher no', 'doc no']),
      partyName: findCol(['party name', 'party', 'customer name', 'shop name', 'account name', 'customer', 'account']),
      phone: findCol(['party contact', 'phone', 'mobile', 'contact', 'tel']),
      email: findCol(['email', 'mail']),
      totalAmount: findCol(['total', 'total amount', 'total income', 'total rs', 'debit', 'sale amount', 'invoice amount', 'amount', 'net total', 'income']),
      received: findCol(['received paid', 'received / paid', 'received/paid', 'received', 'paid', 'credit', 'payment', 'collection', 'payment in', 'amount received', 'money in']),
      receivableBalance: findCol(['receivable balance', 'receivable', 'closing balance', 'balance', 'running balance', 'net balance', 'txn balance']),
      payableBalance: findCol(['payable balance', 'payable']),
      paymentType: findCol(['payment type', 'payment mode', 'mode', 'pay mode', 'payment method']),
      paymentRef: findCol(['payment reference', 'ref no', 'cheque no', 'utr', 'transaction id', 'chq no']),
      description: findCol(['description', 'narration', 'remark', 'remarks', 'notes']),
    });
  };

  // Auto Column Mapper for Item Details Sheet
  const autoMapItemColumns = (sheetRows = []) => {
    if (!sheetRows || sheetRows.length === 0) return;

    let headerIdx = 0;
    for (let i = 0; i < Math.min(35, sheetRows.length); i++) {
      const row = (sheetRows[i] || []).map((c) =>
        String(c).toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
      );
      let matches = 0;
      if (row.some((c) => c === 'date' || c.includes('date'))) matches++;
      if (row.some((c) => c.includes('item') || c.includes('product') || c.includes('description') || c.includes('particular'))) matches++;
      if (row.some((c) => c.includes('qty') || c.includes('quantity') || c.includes('weight') || c.includes('kg'))) matches++;
      if (row.some((c) => c.includes('rate') || c.includes('price'))) matches++;
      if (row.some((c) => c.includes('amount') || c.includes('total') || c.includes('value'))) matches++;
      if (row.some((c) => c.includes('invoice') || c.includes('bill') || c.includes('ref'))) matches++;

      if (matches >= 2) {
        headerIdx = i;
        break;
      }
    }

    const rawItemHeadersRow = sheetRows[headerIdx] || [];
    setItemHeaders(rawItemHeadersRow);
    const headers = rawItemHeadersRow.map((c) =>
      String(c).toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
    );
    const findCol = (aliases) => {
      return headers.findIndex((h) => {
        if (!h) return false;
        return aliases.some((a) => {
          const cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
          return h === cleanA || h.includes(cleanA) || cleanA.includes(h);
        });
      });
    };

    setItemColMap({
      date: findCol(['date', 'invoice date', 'bill date', 'entry date']),
      invoiceNo: findCol(['invoice ref no', 'invoice ref', 'ref no', 'invoice no', 'bill no', 'vch no', 'invoice', 'bill', 'voucher no']),
      partyName: findCol(['party name', 'party', 'customer name', 'shop name']),
      itemName: findCol(['item name', 'product name', 'item', 'product', 'goods description', 'description', 'particulars']),
      itemCode: findCol(['item code', 'product code', 'code', 'sku', 'barcode']),
      hsn: findCol(['hsn', 'hsn sac', 'sac', 'hsn code']),
      category: findCol(['category', 'group', 'item group']),
      quantity: findCol(['quantity', 'qty', 'qty kg', 'total kg', 'weight', 'count', 'units']),
      unit: findCol(['unit', 'uom', 'pack size', 'measure']),
      unitPrice: findCol(['unit price', 'rate', 'price', 'rate kg', 'item rate', 'selling price']),
      discount: findCol(['discount', 'disc']),
      amount: findCol(['amount', 'total', 'item amount', 'net amount', 'total amount', 'value']),
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
      const itemsByInvoiceMap = new Map(); // cleanInvKey -> Array of item objects

      const cleanInvKey = (inv) => String(inv || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

      if (itemRows.length > 0) {
        let itemHeaderIdx = 0;
        for (let i = 0; i < Math.min(10, itemRows.length); i++) {
          const row = (itemRows[i] || []).map((c) =>
            String(c).toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
          );
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
            productName: rawItem || 'Spice Product',
            name: rawItem || 'Spice Product',
            itemCode: itemColMap.itemCode !== -1 ? String(row[itemColMap.itemCode] || '').trim() : '',
            productCode: itemColMap.itemCode !== -1 ? String(row[itemColMap.itemCode] || '').trim() : '',
            hsn: itemColMap.hsn !== -1 ? String(row[itemColMap.hsn] || '').trim() : '',
            hsnCode: itemColMap.hsn !== -1 ? String(row[itemColMap.hsn] || '').trim() : '',
            category: itemColMap.category !== -1 ? String(row[itemColMap.category] || '').trim() : 'Spices',
            quantity: rawQty,
            quantityKg: rawQty,
            unit: itemColMap.unit !== -1 ? String(row[itemColMap.unit] || 'KG').trim() : 'KG',
            unitPrice: rawPrice,
            rate: rawPrice,
            pricePerKg: rawPrice,
            sellingPrice: rawPrice,
            discount: itemColMap.discount !== -1 ? cleanNumber(row[itemColMap.discount]) : 0,
            amount: rawAmt,
            subtotal: rawAmt,
            total: rawAmt,
          };

          detectedItemsList.push(itemObj);

          if (rawInv) {
            const cleanInv = cleanInvKey(rawInv);
            if (!itemsByInvoiceMap.has(cleanInv)) {
              itemsByInvoiceMap.set(cleanInv, []);
            }
            itemsByInvoiceMap.get(cleanInv).push(itemObj);
          }
        }
      }

      // --- B. Process Party Statement Report Sheet ---
      let stmtHeaderIdx = 0;
      for (let i = 0; i < Math.min(35, stmtRows.length); i++) {
        const row = (stmtRows[i] || []).map((c) =>
          String(c).toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
        );
        let matches = 0;
        if (row.some((c) => c === 'date' || c.includes('date') || c === 'dt')) matches++;
        if (row.some((c) => c.includes('type') || c.includes('particular') || c.includes('voucher') || c.includes('vch'))) matches++;
        if (row.some((c) => c.includes('ref') || c.includes('invoice') || c.includes('bill') || c.includes('doc'))) matches++;
        if (row.some((c) => c.includes('total') || c.includes('amount') || c.includes('debit') || c.includes('income'))) matches++;
        if (row.some((c) => c.includes('received') || c.includes('paid') || c.includes('credit') || c.includes('payment'))) matches++;
        if (row.some((c) => c.includes('balance') || c.includes('receivable') || c.includes('payable'))) matches++;

        if (matches >= 2) {
          stmtHeaderIdx = i;
          break;
        }
      }

      let runningPartyName = defaultPartyName || '';

      for (let r = stmtHeaderIdx + 1; r < stmtRows.length; r++) {
        const row = stmtRows[r];
        if (!row || row.length === 0) continue;

        let rawParty = statementColMap.partyName !== -1 ? String(row[statementColMap.partyName] || '').trim() : '';
        if (rawParty) runningPartyName = rawParty;
        else rawParty = runningPartyName || defaultPartyName;

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
        const rawPhone = statementColMap.phone !== -1 ? String(row[statementColMap.phone] || '').replace(/[^0-9]/g, '').trim() : (defaultPartyPhone || '');
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
          // Priority 1: User explicitly selected an existing target shop in Wizard Step 2
          if (selectedTargetShopId) {
            matchedShop = shops.find((s) => s.id === selectedTargetShopId) || null;
          }
          // Priority 2: Exact phone match
          if (!matchedShop && rawPhone && existingShopsByPhone.has(rawPhone)) {
            matchedShop = existingShopsByPhone.get(rawPhone);
          }
          // Priority 3: Exact normalized name match
          if (!matchedShop && existingShopsByName.has(normPName)) {
            matchedShop = existingShopsByName.get(normPName);
          }
          // Priority 4: Fuzzy name & token overlap matcher (isShopMatchingRecord)
          if (!matchedShop) {
            matchedShop = shops.find((s) => isShopMatchingRecord({ name: rawParty, mobile: rawPhone }, s)) || null;
          }

          const partyObj = {
            id: matchedShop ? matchedShop.id : `shop-hist-${Date.now()}-${detectedPartiesMap.size + 1}`,
            name: matchedShop ? matchedShop.name : rawParty,
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

          const linkedItems = itemsByInvoiceMap.get(cleanInvKey(billNo)) || [];
          const totalKgFromItems = linkedItems.reduce((sum, it) => sum + (it.quantityKg || 0), 0);
          const computedSubtotal = rawTotal || (rawRec + rawRecBal) || linkedItems.reduce((sum, it) => sum + (it.amount || 0), 0);

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
            paidAmount: rawRec,
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
          const refNo = rawInv || rawPayRef || `HIST-RCP-${r}`;
          const colAmount = rawRec > 0 ? rawRec : rawTotal;
          const colKey = `${normPName}_${rawDate}_${colAmount}`;
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
            amount: colAmount,
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

          const linkedRetItems = itemsByInvoiceMap.get(cleanInvKey(retNo)) || [];
          const totalRetKg = linkedRetItems.reduce((sum, it) => sum + (it.quantityKg || 0), 0);

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
            productName: linkedRetItems.length > 0 ? linkedRetItems.map((it) => it.itemName).join(', ') : (rawDesc || 'Historical Credit Note / Return'),
            quantityKg: totalRetKg,
            returnValue: rawTotal || rawRec,
            amount: rawTotal || rawRec,
            items: linkedRetItems,
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

      // --- C. Fallback: If no orders were generated from Statement sheet, but Item Details sheet has items ---
      if (detectedOrdersList.length === 0 && detectedItemsList.length > 0) {
        const fallbackPartyName =
          defaultPartyName ||
          (fileName ? fileName.replace(/\.(xlsx|xls|csv)$/i, '').replace(/party[\s_-]*statement/gi, '').replace(/statement/gi, '').replace(/report/gi, '').replace(/[_-]+/g, ' ').trim() : '') ||
          `${selectedMarket?.name || 'Market'} Customer`;

        const groupedByInvoice = new Map();

        detectedItemsList.forEach((it, idx) => {
          const pName = it.partyName || fallbackPartyName;
          const inv = it.invoiceNo || `BILL-${Math.floor(idx / 5) + 1}`;
          const d = it.date || getFormattedDate();
          const groupKey = `${pName}___${inv}___${d}`;

          if (!groupedByInvoice.has(groupKey)) {
            groupedByInvoice.set(groupKey, {
              partyName: pName,
              invoiceNo: inv,
              date: d,
              items: [],
            });
          }
          groupedByInvoice.get(groupKey).items.push(it);
        });

        groupedByInvoice.forEach((group) => {
          const normPName = normalizeStr(group.partyName);

          if (!detectedPartiesMap.has(normPName)) {
            let matchedShop = null;
            if (defaultPartyPhone && existingShopsByPhone.has(defaultPartyPhone)) {
              matchedShop = existingShopsByPhone.get(defaultPartyPhone);
            } else if (existingShopsByName.has(normPName)) {
              matchedShop = existingShopsByName.get(normPName);
            }

            const partyObj = {
              id: matchedShop ? matchedShop.id : `shop-hist-${Date.now()}-${detectedPartiesMap.size + 1}`,
              name: group.partyName,
              owner: matchedShop?.owner || group.partyName,
              phone: defaultPartyPhone || matchedShop?.mobile || '',
              mobile: defaultPartyPhone || matchedShop?.mobile || '',
              email: matchedShop?.email || '',
              address: matchedShop?.address || `${selectedMarket?.name || 'Main Market'} Road`,
              marketId: selectedMarketId,
              marketName: selectedMarket?.name || 'Market',
              routeId: selectedMarket?.routeId || '',
              openingReceivable: 0,
              openingPayable: 0,
              isNew: !matchedShop,
              existingShopId: matchedShop ? matchedShop.id : null,
              source: 'OLD_IMPORT',
              isHistorical: true,
            };
            detectedPartiesMap.set(normPName, partyObj);
          }

          const currentParty = detectedPartiesMap.get(normPName);
          const totalKg = group.items.reduce((sum, it) => sum + (it.quantityKg || it.quantity || 0), 0);
          const totalAmount = group.items.reduce((sum, it) => sum + (it.amount || it.subtotal || 0), 0);
          const saleKey = `${normPName}_${group.invoiceNo.trim()}_${group.date}`;
          const isDuplicate = existingOrderKeys.has(saleKey);

          const orderRecord = {
            id: `HIST-ORD-${group.invoiceNo}-${Date.now()}-${detectedOrdersList.length}`,
            invoiceNo: group.invoiceNo,
            invoiceRef: group.invoiceNo,
            billNo: group.invoiceNo,
            shopId: currentParty.id,
            shopName: group.partyName,
            marketId: selectedMarketId,
            marketName: selectedMarket?.name || 'Market',
            date: group.date,
            time: '10:00 AM',
            totalKg,
            totalPouches: 0,
            subtotal: totalAmount,
            grandTotal: totalAmount,
            paidAmount: 0,
            items: group.items,
            remark: 'Imported from Items Sheet',
            source: 'OLD_IMPORT',
            dataSource: 'OLD IMPORT',
            isHistorical: true,
            isDuplicate,
          };
          detectedOrdersList.push(orderRecord);
        });
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
      if (filterMarket !== 'ALL' && it.marketId !== filterMarket && it.marketName !== filterMarket) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchItem = (it.itemName || '').toLowerCase().includes(q);
        const matchParty = (it.partyName || '').toLowerCase().includes(q);
        const matchBill = (it.billNo || '').toLowerCase().includes(q);
        if (!matchItem && !matchParty && !matchBill) return false;
      }
      return true;
    });
  }, [historicalSaleItems, filterMarket, searchQuery]);

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

  // Current tab items for bulk actions
  const currentTabItems = useMemo(() => {
    if (activeTab === 'parties') return filteredShopsList;
    if (activeTab === 'sales') return filteredOrdersList;
    if (activeTab === 'items') return filteredItemsList;
    if (activeTab === 'collections') return filteredCollectionsList;
    if (activeTab === 'returns') return filteredReturnsList;
    return [];
  }, [activeTab, filteredShopsList, filteredOrdersList, filteredItemsList, filteredCollectionsList, filteredReturnsList]);

  const isAllCurrentSelected = currentTabItems.length > 0 && currentTabItems.every((it) => selectedRowIds.has(it.id));
  const isSomeCurrentSelected = currentTabItems.some((it) => selectedRowIds.has(it.id));

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

      {/* 3.5 Bulk Action & Selection Toolbar */}
      {['parties', 'sales', 'items', 'collections', 'returns'].includes(activeTab) && (
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={isAllCurrentSelected}
                ref={(el) => {
                  if (el) el.indeterminate = !isAllCurrentSelected && isSomeCurrentSelected;
                }}
                onChange={() => handleSelectAllRows(currentTabItems)}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
              />
              <span>Select All Visible ({currentTabItems.length})</span>
            </label>

            {selectedRowIds.size > 0 && (
              <span className="px-2.5 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-lg flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5" />
                {selectedRowIds.size} Selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedRowIds.size > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Deselect
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedRowIds.size})</span>
                </button>
              </>
            )}

            {currentTabItems.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAllFiltered}
                className="px-3.5 py-1.5 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                title="Permanently delete all records matching current filter"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Delete All Filtered ({currentTabItems.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Tab Content Views */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* TAB 1: PARTY / SHOP MASTER */}
        {activeTab === 'parties' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllCurrentSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !isAllCurrentSelected && isSomeCurrentSelected;
                      }}
                      onChange={() => handleSelectAllRows(filteredShopsList)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5">Party / Shop Name</th>
                  <th className="p-3.5">Market</th>
                  <th className="p-3.5">Mobile / Phone</th>
                  <th className="p-3.5 text-right">Opening Rec.</th>
                  <th className="p-3.5 text-right">Opening Pay.</th>
                  <th className="p-3.5 text-right">Current Outstanding</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredShopsList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                      No historical parties found. Upload an Excel file to import.
                    </td>
                  </tr>
                ) : (
                  filteredShopsList.map((s) => (
                    <tr key={s.id} className={`hover:bg-slate-50/80 transition-colors ${selectedRowIds.has(s.id) ? 'bg-red-50/40' : ''}`}>
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRowIds.has(s.id)}
                          onChange={() => handleToggleSelectRow(s.id)}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                      </td>
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
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditParty(s)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-all border border-blue-200"
                            title="Edit / Rename Party"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDeletingParty(s); setDeletePartyTransactions(true); }}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-all border border-red-200"
                            title="Delete Party and All Records"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllCurrentSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !isAllCurrentSelected && isSomeCurrentSelected;
                      }}
                      onChange={() => handleSelectAllRows(filteredOrdersList)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5">Bill / Invoice No.</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Party Name</th>
                  <th className="p-3.5">Market</th>
                  <th className="p-3.5 text-right">Total KG</th>
                  <th className="p-3.5 text-right">Bill Total (₹)</th>
                  <th className="p-3.5 text-center">Source</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredOrdersList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                      No historical sales bills found.
                    </td>
                  </tr>
                ) : (
                  filteredOrdersList.map((o) => (
                    <tr key={o.id} className={`hover:bg-slate-50/80 transition-colors ${selectedRowIds.has(o.id) ? 'bg-red-50/40' : ''}`}>
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRowIds.has(o.id)}
                          onChange={() => handleToggleSelectRow(o.id)}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                      </td>
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
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete historical bill "${o.invoiceNo || o.id}"?`)) {
                              deleteOrder(o.id);
                            }
                          }}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-all border border-red-200"
                          title="Delete Bill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllCurrentSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !isAllCurrentSelected && isSomeCurrentSelected;
                      }}
                      onChange={() => handleSelectAllRows(filteredItemsList)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5">Bill No.</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Party Name</th>
                  <th className="p-3.5">Item Name</th>
                  <th className="p-3.5">Item Code / HSN</th>
                  <th className="p-3.5 text-right">Quantity</th>
                  <th className="p-3.5 text-right">Unit Price</th>
                  <th className="p-3.5 text-right">Amount (₹)</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredItemsList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                      No item-wise sales history available.
                    </td>
                  </tr>
                ) : (
                  filteredItemsList.slice(0, 300).map((it) => (
                    <tr key={it.id} className={`hover:bg-slate-50/80 transition-colors ${selectedRowIds.has(it.id) ? 'bg-red-50/40' : ''}`}>
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRowIds.has(it.id)}
                          onChange={() => handleToggleSelectRow(it.id)}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                      </td>
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
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete bill "${it.billNo}" and all its item records?`)) {
                              deleteOrder(it.orderId);
                            }
                          }}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-all border border-red-200"
                          title="Delete Bill / Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllCurrentSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !isAllCurrentSelected && isSomeCurrentSelected;
                      }}
                      onChange={() => handleSelectAllRows(filteredCollectionsList)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5">Receipt / Ref No.</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Party Name</th>
                  <th className="p-3.5">Mode</th>
                  <th className="p-3.5 text-right">Amount (₹)</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCollectionsList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                      No historical collection/payment records found.
                    </td>
                  </tr>
                ) : (
                  filteredCollectionsList.map((c) => (
                    <tr key={c.id} className={`hover:bg-slate-50/80 transition-colors ${selectedRowIds.has(c.id) ? 'bg-red-50/40' : ''}`}>
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRowIds.has(c.id)}
                          onChange={() => handleToggleSelectRow(c.id)}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                      </td>
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
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete payment receipt "${c.receiptNumber || c.refNo || c.id}"?`)) {
                              deleteCollection(c.id);
                            }
                          }}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-all border border-red-200"
                          title="Delete Payment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllCurrentSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !isAllCurrentSelected && isSomeCurrentSelected;
                      }}
                      onChange={() => handleSelectAllRows(filteredReturnsList)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5">Invoice / CN No.</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Party Name</th>
                  <th className="p-3.5">Product Name</th>
                  <th className="p-3.5 text-right">Return Value (₹)</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5 text-center">Type</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredReturnsList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                      No historical returns or credit notes recorded.
                    </td>
                  </tr>
                ) : (
                  filteredReturnsList.map((r) => (
                    <tr key={r.id} className={`hover:bg-slate-50/80 transition-colors ${selectedRowIds.has(r.id) ? 'bg-red-50/40' : ''}`}>
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRowIds.has(r.id)}
                          onChange={() => handleToggleSelectRow(r.id)}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                      </td>
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
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete return record "${r.invoiceNo || r.id}"?`)) {
                              deleteReturn(r.id);
                            }
                          }}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-all border border-red-200"
                          title="Delete Return"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {importBatches.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
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
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete import batch "${b.fileName || b.id}" and all records created by it?`)) {
                              deleteImportBatch(b.id);
                            }
                          }}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-all border border-red-200"
                          title="Delete Batch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-red-700" />
                        <span>STEP 1 – SELECT MANDATORY TARGET MARKET *</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddMarketModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-black transition-all active:scale-95 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add New Market</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Every imported party and bill will link to this market. Marketers assigned to this market will automatically see their parties.
                    </p>

                    {marketActionMsg && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>{marketActionMsg}</span>
                      </div>
                    )}

                    <select
                      value={selectedMarketId}
                      onChange={(e) => {
                        if (e.target.value === '__ADD_NEW_MARKET__') {
                          setShowAddMarketModal(true);
                        } else {
                          setSelectedMarketId(e.target.value);
                        }
                      }}
                      className="w-full p-3.5 bg-slate-50 border-2 border-slate-300 focus:border-red-600 rounded-2xl text-sm font-bold text-slate-900 cursor-pointer"
                    >
                      <option value="">-- Choose Market (e.g. Akodiya, Pachore, Ashta, etc.) --</option>
                      {markets.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.group ? `(${m.group})` : ''} {m.assignedMarketerName ? `[${m.assignedMarketerName}]` : ''}
                        </option>
                      ))}
                      <option value="__ADD_NEW_MARKET__" className="text-red-700 font-black">
                        ➕ + Add New Market...
                      </option>
                    </select>
                  </div>

                  {/* Quick Add Market Modal */}
                  {showAddMarketModal && (
                    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="p-5 bg-gradient-to-r from-red-800 to-red-950 text-white flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-red-700/60 rounded-xl">
                              <MapPin className="w-5 h-5 text-amber-300" />
                            </div>
                            <div>
                              <h3 className="text-base font-black uppercase tracking-tight">Add New Market</h3>
                              <p className="text-xs text-red-200 font-medium">Create a market and auto-select it for import</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddMarketModal(false);
                              setNewMarketError('');
                            }}
                            className="p-2 text-red-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleCreateMarket} className="p-6 space-y-4">
                          {newMarketError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              <span>{newMarketError}</span>
                            </div>
                          )}

                          {/* Market Name */}
                          <div>
                            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                              Market Name *
                            </label>
                            <input
                              type="text"
                              required
                              autoFocus
                              placeholder="e.g. Biaora, Sujalpur, Ashta, etc."
                              value={newMarketName}
                              onChange={(e) => {
                                setNewMarketName(e.target.value);
                                if (newMarketError) setNewMarketError('');
                              }}
                              className="w-full p-3 bg-slate-50 border-2 border-slate-300 focus:border-red-600 focus:bg-white rounded-xl text-sm font-bold text-slate-900 outline-none transition-all"
                            />
                          </div>

                          {/* District & Marketer Assignment */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                District
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Shajapur, Rajgarh"
                                value={newMarketDistrict}
                                onChange={(e) => setNewMarketDistrict(e.target.value)}
                                className="w-full p-3 bg-slate-50 border-2 border-slate-300 focus:border-red-600 focus:bg-white rounded-xl text-sm font-bold text-slate-900 outline-none transition-all"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                Assign Marketer (Optional)
                              </label>
                              <select
                                value={newMarketMarketerId}
                                onChange={(e) => setNewMarketMarketerId(e.target.value)}
                                className="w-full p-3 bg-slate-50 border-2 border-slate-300 focus:border-red-600 focus:bg-white rounded-xl text-sm font-bold text-slate-900 outline-none transition-all"
                              >
                                <option value="">-- None / Assign Later --</option>
                                {marketers.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name} ({m.mobile || 'No Mobile'})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Distance KM & Fuel Rate */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                Est. Distance (KM)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={newMarketDistanceKm}
                                onChange={(e) => setNewMarketDistanceKm(e.target.value)}
                                className="w-full p-3 bg-slate-50 border-2 border-slate-300 focus:border-red-600 focus:bg-white rounded-xl text-sm font-bold text-slate-900 outline-none transition-all"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                Fuel Rate (₹/KM)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={newMarketFuelRate}
                                onChange={(e) => setNewMarketFuelRate(e.target.value)}
                                className="w-full p-3 bg-slate-50 border-2 border-slate-300 focus:border-red-600 focus:bg-white rounded-xl text-sm font-bold text-slate-900 outline-none transition-all"
                              />
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddMarketModal(false);
                                setNewMarketError('');
                              }}
                              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-5 py-2.5 bg-gradient-to-r from-red-700 to-red-900 hover:from-red-800 hover:to-red-950 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Save & Select Market</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

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
                  {/* Sheet Selectors */}
                  <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-2xl text-xs space-y-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <p className="font-bold text-amber-900 uppercase">Workbook Sheets Detected</p>
                        <p className="text-slate-600">File: <strong>{fileName}</strong> • Market: <strong>{selectedMarket?.name}</strong></p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Statement Sheet</label>
                          <select
                            value={statementSheetName}
                            onChange={(e) => {
                              const sName = e.target.value;
                              setStatementSheetName(sName);
                              autoMapStatementColumns(rawSheets[sName] || []);
                            }}
                            className="p-2 bg-white border border-slate-300 rounded-xl font-bold text-xs"
                          >
                            {sheetNamesList.map((sn) => (
                              <option key={sn} value={sn}>{sn}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Item Details Sheet</label>
                          <select
                            value={itemsSheetName}
                            onChange={(e) => {
                              const sName = e.target.value;
                              setItemsSheetName(sName);
                              if (sName && rawSheets[sName]) {
                                autoMapItemColumns(rawSheets[sName]);
                              }
                            }}
                            className="p-2 bg-white border border-slate-300 rounded-xl font-bold text-xs"
                          >
                            <option value="">-- None / Single Sheet --</option>
                            {sheetNamesList.map((sn) => (
                              <option key={sn} value={sn}>{sn}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Party Context Card (Single-Party Statement / Default) */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-black text-slate-900 text-xs uppercase flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-red-700" />
                        <span>Target Party (For Single-Party Statement / Default)</span>
                      </h3>
                      {defaultPartyName && (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          ✨ Detected: {defaultPartyName}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      If importing a single party's statement (e.g. <em>Sawariya Kirana</em>), you can link it directly to an existing shop in the database, or verify the name below.
                    </p>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Link to Existing Shop / Customer Profile (Optional)
                      </label>
                      <select
                        value={selectedTargetShopId}
                        onChange={(e) => {
                          const sId = e.target.value;
                          setSelectedTargetShopId(sId);
                          const chosen = shops.find((s) => s.id === sId);
                          if (chosen) {
                            setDefaultPartyName(chosen.name);
                            if (chosen.mobile) setDefaultPartyPhone(chosen.mobile);
                          }
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 focus:border-red-600 rounded-xl font-bold text-slate-900 outline-none"
                      >
                        <option value="">-- Auto-Match by Name/Phone or Create New --</option>
                        {shops.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.connectedMarketName || s.marketName || 'Market'}) {s.mobile ? `[${s.mobile}]` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Customer / Party Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. Sawariya Kirana Store"
                          value={defaultPartyName}
                          onChange={(e) => setDefaultPartyName(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-300 focus:border-red-600 rounded-xl font-bold text-slate-900 outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Customer Mobile / Phone</label>
                        <input
                          type="text"
                          placeholder="e.g. 9826012345"
                          value={defaultPartyPhone}
                          onChange={(e) => setDefaultPartyPhone(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-300 focus:border-red-600 rounded-xl font-bold text-slate-900 outline-none"
                        />
                      </div>
                    </div>
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
                        <label className="font-bold text-slate-600 block mb-1">Party Name Column</label>
                        <select
                          value={statementColMap.partyName}
                          onChange={(e) => setStatementColMap({ ...statementColMap, partyName: Number(e.target.value) })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          <option value={-1}>-- Not In Table (Use Target Party Above) --</option>
                          {(statementHeaders.length > 0 ? statementHeaders : rawSheets[statementSheetName]?.[0] || []).map((col, idx) => (
                            <option key={idx} value={idx}>
                              Col {idx + 1}: {col || `Column ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Txn Type Column (Sale/Payment-In/Return)</label>
                        <select
                          value={statementColMap.txnType}
                          onChange={(e) => setStatementColMap({ ...statementColMap, txnType: Number(e.target.value) })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          <option value={-1}>-- Auto Detect from Debit/Credit --</option>
                          {(statementHeaders.length > 0 ? statementHeaders : rawSheets[statementSheetName]?.[0] || []).map((col, idx) => (
                            <option key={idx} value={idx}>
                              Col {idx + 1}: {col || `Column ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Invoice / Ref No Column</label>
                        <select
                          value={statementColMap.invoiceNo}
                          onChange={(e) => setStatementColMap({ ...statementColMap, invoiceNo: Number(e.target.value) })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          <option value={-1}>-- Select Column --</option>
                          {(statementHeaders.length > 0 ? statementHeaders : rawSheets[statementSheetName]?.[0] || []).map((col, idx) => (
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
                          {(statementHeaders.length > 0 ? statementHeaders : rawSheets[statementSheetName]?.[0] || []).map((col, idx) => (
                            <option key={idx} value={idx}>
                              Col {idx + 1}: {col || `Column ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Total / Sale Amount Column</label>
                        <select
                          value={statementColMap.totalAmount}
                          onChange={(e) => setStatementColMap({ ...statementColMap, totalAmount: Number(e.target.value) })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          <option value={-1}>-- Select Column --</option>
                          {(statementHeaders.length > 0 ? statementHeaders : rawSheets[statementSheetName]?.[0] || []).map((col, idx) => (
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
                          {(statementHeaders.length > 0 ? statementHeaders : rawSheets[statementSheetName]?.[0] || []).map((col, idx) => (
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
                          {(statementHeaders.length > 0 ? statementHeaders : rawSheets[statementSheetName]?.[0] || []).map((col, idx) => (
                            <option key={idx} value={idx}>
                              Col {idx + 1}: {col || `Column ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Payment Type (Cash/Bank)</label>
                        <select
                          value={statementColMap.paymentType}
                          onChange={(e) => setStatementColMap({ ...statementColMap, paymentType: Number(e.target.value) })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                        >
                          <option value={-1}>-- Default (Cash) --</option>
                          {(statementHeaders.length > 0 ? statementHeaders : rawSheets[statementSheetName]?.[0] || []).map((col, idx) => (
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

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 6. EDIT PARTY MODAL (HISTORICAL MASTER)                           */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {editingParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-600" />
                  EDIT HISTORICAL PARTY
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Rename party name, update contact number or market.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingParty(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <form id="hist-party-edit-form" onSubmit={handleSaveEditParty} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Party / Shop Name *</label>
                  <input
                    type="text"
                    required
                    value={editPartyName}
                    onChange={(e) => setEditPartyName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Mahavir Kirana Store"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Renaming this party will automatically cascade to all historical bills and payment receipts.</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Owner Name</label>
                    <input
                      type="text"
                      value={editPartyOwner}
                      onChange={(e) => setEditPartyOwner(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Mobile / Phone</label>
                    <input
                      type="tel"
                      value={editPartyMobile}
                      onChange={(e) => setEditPartyMobile(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Address</label>
                  <input
                    type="text"
                    value={editPartyAddress}
                    onChange={(e) => setEditPartyAddress(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Market</label>
                  <select
                    value={editPartyMarketId}
                    onChange={(e) => setEditPartyMarketId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {markets.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Outstanding Balance (₹)</label>
                  <input
                    type="number"
                    value={editPartyOutstanding}
                    onChange={(e) => setEditPartyOutstanding(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => setEditingParty(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="hist-party-edit-form"
                className="flex-1 py-3 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 7. DELETE PARTY CONFIRMATION MODAL                                */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {deletingParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-700 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900">Delete Party From Everywhere?</h3>
              <p className="text-xs text-slate-500 font-medium">
                Are you sure you want to delete <strong className="text-slate-800">{deletingParty.name}</strong>?
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-2">
              <label className="flex items-start gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={deletePartyTransactions}
                  onChange={(e) => setDeletePartyTransactions(e.target.checked)}
                  className="mt-0.5 rounded text-red-600 focus:ring-red-500"
                />
                <span>Delete from EVERYWHERE (Historical Data Import, Shops Master, Party Statement, Bills & Receipts)</span>
              </label>
              <p className="text-[10px] text-slate-400 pl-5">
                All bills, line items, payment-in receipts, and returns of this party will be permanently deleted from the entire application.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingParty(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteParty}
                className="flex-1 py-2.5 bg-red-700 text-white font-bold rounded-xl hover:bg-red-800 text-xs"
              >
                Delete Everywhere
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
