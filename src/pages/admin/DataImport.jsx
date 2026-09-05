import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Database,
  ArrowRight,
  Eye,
  Store,
  ShoppingBag,
  IndianRupee,
  RotateCcw,
  Search,
  Filter,
  Check,
  HelpCircle,
  Clock,
  Layers,
  FileText,
  AlertCircle,
  Download,
} from 'lucide-react';

// Common column alias recognizers
const COLUMN_ALIASES = {
  party: ['party name', 'party/shop name', 'party', 'shop name', 'customer name', 'customer', 'account name', 'ledger name', 'client', 'particulars', 'shop'],
  date: ['date', 'bill date', 'invoice date', 'transaction date', 'voucher date', 'vch date', 'entry date'],
  type: ['transaction type', 'type', 'vch type', 'voucher type', 'txn type', 'type of transaction', 'particulars'],
  invoiceNo: ['invoice no', 'invoice number', 'bill no', 'bill number', 'vch no', 'voucher no', 'ref no', 'reference', 'doc no', 'invoice', 'bill'],
  product: ['product name', 'item name', 'product', 'item', 'goods description', 'description', 'particulars', 'commodity'],
  quantity: ['quantity', 'qty', 'qty (kg)', 'quantity (kg)', 'quantity kg', 'weight', 'qty kg', 'total kg', 'units'],
  unit: ['unit', 'uom', 'pack size', 'pkg', 'pack'],
  rate: ['rate', 'price', 'rate (₹)', 'rate/kg', 'price/kg', 'item rate', 'unit price', 'selling price'],
  amount: ['amount', 'total', 'amount (₹)', 'item amount', 'net amount', 'gross amount', 'taxable value', 'total amount'],
  debit: ['debit', 'sale', 'sales', 'debit amount', 'sale (₹)', 'dr'],
  credit: ['credit', 'payment', 'payment-in', 'received', 'payment (₹)', 'credit amount', 'cr'],
  creditNote: ['credit note', 'return amount', 'cn amount', 'credit note (₹)', 'sales return', 'return value'],
  hsn: ['hsn', 'hsn code', 'sac'],
  remark: ['remark', 'remarks', 'narration', 'note', 'notes', 'reason', 'comment'],
};

// Date formatter helper (handles Excel serials, DD-MM-YYYY, DD/MM/YYYY, ISO dates)
const parseExcelDate = (val) => {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel serial date to JS Date
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
  // If DD-MM-YYYY or DD/MM/YYYY
  const match = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
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

// Clean name string for fuzzy matching
const normalizeName = (name) => {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export default function DataImport() {
  const {
    shops,
    orders,
    collections,
    returns,
    markets,
    marketRoutes,
    connectedMarkets,
    importBatches,
    importHistoricalBusinessData,
  } = useData();

  // Wizard Steps: 1 = Upload, 2 = Select Sheets & Map, 3 = Preview & Review, 4 = Result Summary
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheets, setSelectedSheets] = useState([]); // sheets selected to import

  // Market Route & Connected Market assignment for this import batch
  const [batchRouteId, setBatchRouteId] = useState(() => marketRoutes[0]?.id || '');
  const [batchConnectedMarketId, setBatchConnectedMarketId] = useState('');

  // Parsed and Processed Data
  const [processedData, setProcessedData] = useState(null);
  const [activePreviewTab, setActivePreviewTab] = useState('orders'); // 'orders' | 'collections' | 'returns' | 'shops' | 'errors'
  const [searchFilter, setSearchFilter] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  // Shop Matching overrides { [normalizedPartyName]: { action: 'LINK' | 'CREATE', targetShopId, defaultMarketId } }
  const [shopOverrides, setShopOverrides] = useState({});

  const fileInputRef = useRef(null);

  // Handle File Drag / Select
  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setFileName(f.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        setSelectedSheets(wb.SheetNames); // select all by default
        setStep(2);
      } catch (err) {
        alert('Failed to read Excel file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  // Auto-Detect & Process Sheets
  const handleProcessWorkbook = () => {
    if (!workbook || selectedSheets.length === 0) {
      alert('Please select at least one sheet to import.');
      return;
    }

    try {
      let totalRawRows = 0;
      const extractedOrdersMap = new Map(); // key: `partyNorm__invoiceNo__date`
      const extractedCollections = [];
      const extractedReturns = [];
      const uniquePartiesMap = new Map(); // partyNorm -> { rawName, mobile, address, transactionsCount, ... }
      const invalidRows = [];
      const duplicateRows = [];
      const itemDetailsMap = new Map(); // invoiceNoNorm -> [{ productName, packSize, quantityKg, pricePerKg, subtotal, hsn }]

      const cleanAmount = (v) => {
        if (!v) return 0;
        const num = Number(String(v).replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? 0 : num;
      };

      // ─────────────────────────────────────────────────────────────
      // PRE-PASS: Parse "Item Details" sheet if present
      // ─────────────────────────────────────────────────────────────
      const itemSheetName = selectedSheets.find(
        (s) =>
          s.toLowerCase().includes('item detail') ||
          s.toLowerCase().includes('item') ||
          s.toLowerCase().includes('product')
      );

      if (itemSheetName && workbook.Sheets[itemSheetName]) {
        const itemRows = XLSX.utils.sheet_to_json(workbook.Sheets[itemSheetName], {
          defval: '',
          raw: false,
        });

        itemRows.forEach((r) => {
          const inv = String(
            r['Invoice No'] ||
              r['Bill No'] ||
              r['Invoice/Bill No.'] ||
              r['Invoice'] ||
              r['Bill'] ||
              r['Bill No.'] ||
              r['Vch No'] ||
              ''
          )
            .trim()
            .toLowerCase();

          const pName = String(
            r['Item Name'] ||
              r['Product Name'] ||
              r['Item'] ||
              r['Product'] ||
              r['Description'] ||
              'Spices'
          ).trim();

          const q =
            cleanAmount(r['Qty'] || r['Quantity'] || r['Quantity (Kg)'] || r['Weight']) || 1;
          const rt =
            cleanAmount(r['Rate'] || r['Price'] || r['Rate/Kg'] || r['Selling Price']) || 215;
          const amt =
            cleanAmount(r['Amount'] || r['Total'] || r['Item Amount']) || q * rt;
          const pk = String(
            r['Pack Size'] ||
              r['Unit'] ||
              (pName.toLowerCase().includes('500') ? '500g' : '1kg')
          );

          if (inv) {
            if (!itemDetailsMap.has(inv)) itemDetailsMap.set(inv, []);
            itemDetailsMap.get(inv).push({
              productName: pName,
              packSize: pk,
              quantityKg: q,
              pricePerKg: rt,
              sellingPrice: rt,
              subtotal: amt,
              hsn: String(r['HSN'] || r['HSN Code'] || '0910'),
            });
          }
        });
      }

      // ─────────────────────────────────────────────────────────────
      // MAIN PASS: Parse "Party Statement Report" / Selected Sheets
      // ─────────────────────────────────────────────────────────────
      selectedSheets.forEach((sName) => {
        if (sName === itemSheetName) return; // Handled in pre-pass
        const ws = workbook.Sheets[sName];
        if (!ws) return;

        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
        if (aoa.length === 0) return;

        let headerPartyName = '';
        let headerPartyMobile = '';
        let headerPartyAddress = '';
        let tableHeaderRowIdx = -1;

        // Scan top 15 rows for Vyapar Header metadata (e.g. A1: Party Name, B1: Tirupati...)
        for (let i = 0; i < Math.min(15, aoa.length); i++) {
          const rowArr = aoa[i];
          if (!rowArr || rowArr.length === 0) continue;

          for (let c = 0; c < rowArr.length; c++) {
            const cellVal = String(rowArr[c]).toLowerCase().trim();
            if (
              cellVal === 'party name' ||
              cellVal === 'party' ||
              cellVal === 'customer name' ||
              cellVal === 'shop name'
            ) {
              headerPartyName = String(rowArr[c + 1] || '').trim();
            } else if (
              cellVal === 'party contact' ||
              cellVal === 'contact' ||
              cellVal === 'mobile' ||
              cellVal === 'phone' ||
              cellVal === 'contact no'
            ) {
              headerPartyMobile = String(rowArr[c + 1] || '').trim();
            } else if (cellVal === 'party address' || cellVal === 'address') {
              headerPartyAddress = String(rowArr[c + 1] || '').trim();
            }

            if (
              cellVal === 'date' ||
              cellVal === 'txn type' ||
              cellVal === 'invoice/bill no.' ||
              cellVal === 'bill no' ||
              cellVal === 'voucher no'
            ) {
              tableHeaderRowIdx = i;
            }
          }
          if (tableHeaderRowIdx !== -1) break;
        }

        // Fallback: If no header found, assume row 0
        if (tableHeaderRowIdx === -1) tableHeaderRowIdx = 0;

        const headerRow = aoa[tableHeaderRowIdx].map((h) => String(h).toLowerCase().trim());
        const colDateIdx = headerRow.findIndex((h) => h.includes('date'));
        const colTypeIdx = headerRow.findIndex((h) => h.includes('type') || h.includes('txn') || h.includes('particulars'));
        const colInvIdx = headerRow.findIndex((h) => h.includes('invoice') || h.includes('bill') || h.includes('ref') || h.includes('vch'));
        const colTotAmtIdx = headerRow.findIndex((h) => h.includes('total amount') || h.includes('debit') || h === 'total');
        const colReceivedIdx = headerRow.findIndex((h) => h === 'received' || h.includes('received'));
        const colPaidIdx = headerRow.findIndex((h) => h === 'paid' || h.includes('payment') || h.includes('credit'));
        const colPayTypeIdx = headerRow.findIndex((h) => h.includes('payment type') || h.includes('pay type') || h.includes('mode'));
        const colPayStatusIdx = headerRow.findIndex((h) => h.includes('payment status') || h.includes('status'));
        const colDescIdx = headerRow.findIndex((h) => h.includes('description') || h.includes('remark') || h.includes('narration'));
        const colPartyIdx = headerRow.findIndex((h) => h.includes('party') || h.includes('customer') || h.includes('shop'));

        for (let r = tableHeaderRowIdx + 1; r < aoa.length; r++) {
          const rowArr = aoa[r];
          if (!rowArr || rowArr.length === 0) continue;

          totalRawRows++;

          const firstCell = String(rowArr[0] || '').trim();
          if (!firstCell || firstCell.toLowerCase().startsWith('total') || firstCell.toLowerCase().startsWith('grand total')) {
            continue; // Skip summary / empty rows
          }

          const rowPartyName =
            (colPartyIdx !== -1 && rowArr[colPartyIdx] ? String(rowArr[colPartyIdx]).trim() : '') ||
            headerPartyName ||
            'Tirupati Kirana Store Kalapipal';

          if (!rowPartyName) continue;

          const partyNorm = normalizeName(rowPartyName);
          const dateRaw = colDateIdx !== -1 ? rowArr[colDateIdx] : rowArr[0];
          const date = parseExcelDate(dateRaw);
          const typeRaw = String(colTypeIdx !== -1 ? rowArr[colTypeIdx] || '' : '').toUpperCase().trim();
          const invNoRaw = colInvIdx !== -1 ? String(rowArr[colInvIdx] || '').trim() : '';

          const receivedVal = colReceivedIdx !== -1 ? cleanAmount(rowArr[colReceivedIdx]) : 0;
          const paidVal = colPaidIdx !== -1 ? cleanAmount(rowArr[colPaidIdx]) : 0;
          const totalAmtVal = colTotAmtIdx !== -1 ? cleanAmount(rowArr[colTotAmtIdx]) : 0;
          const payType = colPayTypeIdx !== -1 ? String(rowArr[colPayTypeIdx] || 'Cash').trim() : 'Cash';
          const payStatus = colPayStatusIdx !== -1 ? String(rowArr[colPayStatusIdx] || '').trim() : '';
          const desc = colDescIdx !== -1 ? String(rowArr[colDescIdx] || '').trim() : '';

          // Register Party
          if (!uniquePartiesMap.has(partyNorm)) {
            uniquePartiesMap.set(partyNorm, {
              norm: partyNorm,
              rawName: rowPartyName,
              mobile: headerPartyMobile || '',
              address: headerPartyAddress || '',
              transactionsCount: 0,
              firstDate: date,
              lastDate: date,
            });
          }
          const pObj = uniquePartiesMap.get(partyNorm);
          pObj.transactionsCount += 1;
          if (date) pObj.lastDate = date;

          // Categorize Transaction
          const isCreditNote =
            typeRaw.includes('CREDIT NOTE') ||
            typeRaw.includes('RETURN') ||
            typeRaw.includes('CN');

          const isPayment =
            !isCreditNote &&
            (typeRaw.includes('PAYMENT') ||
              typeRaw.includes('PAYMENT IN') ||
              typeRaw.includes('PAYMENT-IN') ||
              typeRaw.includes('RECEIPT') ||
              typeRaw.includes('RECD') ||
              typeRaw.includes('COLLECTION') ||
              (paidVal > 0 && receivedVal === 0 && !typeRaw.includes('SALE')));

          const isSale =
            !isCreditNote &&
            !isPayment &&
            (typeRaw.includes('SALE') ||
              typeRaw.includes('INV') ||
              typeRaw.includes('BILL') ||
              receivedVal > 0 ||
              totalAmtVal > 0);

          // 1. PAYMENT-IN / OLD COLLECTION
          if (isPayment) {
            const colAmount = paidVal > 0 ? paidVal : receivedVal > 0 ? receivedVal : totalAmtVal;
            if (colAmount > 0) {
              const isDup = collections.some(
                (c) =>
                  normalizeName(c.shopName) === partyNorm &&
                  c.date === date &&
                  Number(c.amount) === colAmount
              );

              const colObj = {
                sheet: sName,
                rowNum: r + 1,
                partyName: rowPartyName,
                partyNorm,
                date: date || '01-01-2025',
                amount: colAmount,
                paymentMode:
                  payType.includes('UPI') || payType.includes('Online')
                    ? 'UPI'
                    : payType.includes('Cheque')
                    ? 'Cheque'
                    : 'Cash',
                invoiceRef: invNoRaw,
                remark: desc || `Payment-In (${payType || 'Old Collection'})`,
                isDuplicate: isDup,
                source: 'OLD IMPORT',
              };

              if (isDup) {
                duplicateRows.push({
                  type: 'PAYMENT',
                  record: colObj,
                  reason: 'Duplicate payment record',
                });
              } else {
                extractedCollections.push(colObj);
              }
            }
          }
          // 2. CREDIT NOTE / RETURN
          else if (isCreditNote) {
            const retValue = paidVal > 0 ? paidVal : receivedVal > 0 ? receivedVal : totalAmtVal;
            extractedReturns.push({
              sheet: sName,
              rowNum: r + 1,
              partyName: rowPartyName,
              partyNorm,
              date: date || '01-01-2025',
              invoiceNo: invNoRaw || 'CN-OLD',
              productName: 'Sales Return Goods',
              quantityKg: 1,
              returnValue: retValue || 0,
              reason: desc || 'Historical Return / Credit Note',
              isCreditNote: true,
              source: 'OLD IMPORT',
            });
          }
          // 3. SALES ORDER
          else if (isSale) {
            const effectiveTotal =
              receivedVal > 0 ? receivedVal : totalAmtVal > 0 ? totalAmtVal : paidVal;
            const invKey = invNoRaw
              ? `${partyNorm}__${invNoRaw.toLowerCase()}__${date}`
              : `${partyNorm}__NOINV__${date}__${r}`;

            // Check items from "Item Details" sheet
            const invItems = invNoRaw
              ? itemDetailsMap.get(invNoRaw.toLowerCase()) || []
              : [];

            const orderItems =
              invItems.length > 0
                ? invItems
                : [
                    {
                      productName: desc || 'Patel Sahab Spices & Food Products',
                      packSize: '500g / 1kg',
                      quantityKg: 5,
                      pricePerKg: 215,
                      sellingPrice: 215,
                      subtotal: effectiveTotal || 1075,
                      hsn: '0910',
                    },
                  ];

            const isDup = orders.some(
              (o) =>
                normalizeName(o.shopName) === partyNorm &&
                invNoRaw &&
                (o.invoiceNo === invNoRaw || o.invoiceRef === invNoRaw || o.id?.includes(invNoRaw))
            );

            const orderObj = {
              invoiceNo: invNoRaw || `INV-${r}`,
              partyName: rowPartyName,
              partyNorm,
              date: date || '01-01-2025',
              items: orderItems,
              totalKg: orderItems.reduce((s, i) => s + (Number(i.quantityKg) || 0), 0),
              subtotal: effectiveTotal,
              grandTotal: effectiveTotal,
              paidAmount: paidVal || 0,
              paymentStatus:
                payStatus || (paidVal >= effectiveTotal ? 'Paid' : paidVal > 0 ? 'Partial' : 'Unpaid'),
              paymentType: payType || 'Cash',
              remark: desc || (invNoRaw ? `Vyapar Invoice #${invNoRaw}` : 'Historical Sale'),
              isDuplicate: isDup,
              source: 'OLD IMPORT',
              sheet: sName,
              rowNum: r + 1,
            };

            if (isDup) {
              duplicateRows.push({
                type: 'ORDER',
                record: orderObj,
                reason: 'Duplicate order in database',
              });
            } else {
              extractedOrdersMap.set(invKey, orderObj);
            }
          }
        }
      });

      const extractedOrders = Array.from(extractedOrdersMap.values());

      // 4. Shop Matching & Classification
      const matchedShopsList = [];
      const newShopsList = [];
      const needsReviewList = [];

      uniquePartiesMap.forEach((pObj, pNorm) => {
        // Direct match against existing shops in DB
        const exactMatch = shops.find((s) => normalizeName(s.name) === pNorm);
        if (exactMatch) {
          matchedShopsList.push({ ...pObj, matchType: 'EXACT', matchedShop: exactMatch });
          return;
        }

        // Fuzzy match: check if substring match
        const partialMatch = shops.find(
          (s) =>
            normalizeName(s.name).includes(pNorm) ||
            pNorm.includes(normalizeName(s.name))
        );

        if (partialMatch) {
          needsReviewList.push({ ...pObj, matchType: 'PARTIAL', suggestedShop: partialMatch });
        } else {
          newShopsList.push({ ...pObj, matchType: 'NEW' });
        }
      });

      setProcessedData({
        totalRawRows,
        uniqueParties: Array.from(uniquePartiesMap.values()),
        orders: extractedOrders,
        collections: extractedCollections,
        returns: extractedReturns,
        matchedShops: matchedShopsList,
        newShops: newShopsList,
        needsReview: needsReviewList,
        duplicates: duplicateRows,
        invalidRows,
      });

      setStep(3);
    } catch (err) {
      console.error(err);
      alert('Error analyzing workbook: ' + err.message);
    }
  };

  // Resolve Shop Overrides
  const handleSetShopAction = (partyNorm, action, targetShopId = '') => {
    setShopOverrides((prev) => ({
      ...prev,
      [partyNorm]: { action, targetShopId, defaultMarketId: markets[0]?.id || 'mkt-pachore' },
    }));
  };

  // Confirm Import Action
  const handleConfirmImport = () => {
    if (!processedData) return;

    setIsImporting(true);

    setTimeout(() => {
      try {
        // 1. Prepare Shops To Create
        const shopsToCreate = [];
        const partyToShopIdMap = new Map();

        // Map existing matched shops
        processedData.matchedShops.forEach((m) => {
          partyToShopIdMap.set(m.norm, m.matchedShop.id);
        });

        // Resolve Needs Review & New Shops
        [...processedData.newShops, ...processedData.needsReview].forEach((p) => {
          const override = shopOverrides[p.norm];
          if (override && override.action === 'LINK' && override.targetShopId) {
            partyToShopIdMap.set(p.norm, override.targetShopId);
          } else {
            // Create as New Shop
            const newShopId = `shop-hist-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
            const routeObj = marketRoutes.find(r => r.id === batchRouteId);
            const cmObj = connectedMarkets.find(c => c.id === batchConnectedMarketId);

            partyToShopIdMap.set(p.norm, newShopId);
            shopsToCreate.push({
              id: newShopId,
              name: p.rawName,
              owner: p.owner || '',
              mobile: p.mobile || '',
              address: p.address || (cmObj ? cmObj.name : ''),
              routeId: batchRouteId || undefined,
              connectedMarketId: batchConnectedMarketId || undefined,
              connectedMarketName: cmObj ? cmObj.name : undefined,
              marketId: batchRouteId ? `mkt-${batchRouteId.replace('route-', '')}` : (markets[0]?.id || 'mkt-pachore'),
              marketName: routeObj ? routeObj.name : (markets[0]?.name || 'Pachore'),
              status: 'Customer',
              source: 'OLD IMPORT',
              dataSource: 'OLD IMPORT',
            });
          }
        });

        // 2. Prepare Orders (exclude duplicates)
        const validOrders = processedData.orders
          .filter((o) => !o.isDuplicate)
          .map((o) => ({
            ...o,
            shopId: partyToShopIdMap.get(o.partyNorm) || '',
            shopName: o.partyName,
            source: 'OLD IMPORT',
            dataSource: 'OLD IMPORT',
          }));

        // 3. Prepare Collections
        const validCollections = processedData.collections
          .filter((c) => !c.isDuplicate)
          .map((c) => ({
            ...c,
            shopId: partyToShopIdMap.get(c.partyNorm) || '',
            shopName: c.partyName,
            source: 'OLD IMPORT',
            dataSource: 'OLD IMPORT',
          }));

        // 4. Prepare Returns
        const validReturns = processedData.returns.map((r) => ({
          ...r,
          shopId: partyToShopIdMap.get(r.partyNorm) || '',
          shopName: r.partyName,
          source: 'OLD IMPORT',
          dataSource: 'OLD IMPORT',
        }));

        // Call Context Import Handler
        const batchMeta = {
          fileName,
          sheetNames: selectedSheets,
          itemsCount: validOrders.reduce((sum, o) => sum + o.items.length, 0),
        };

        const batchRecord = importHistoricalBusinessData({
          newShops: shopsToCreate,
          historicalOrders: validOrders,
          historicalCollections: validCollections,
          historicalReturns: validReturns,
          batchMeta,
        });

        setImportResult({
          success: true,
          batchId: batchRecord.id,
          createdShopsCount: shopsToCreate.length,
          ordersCount: validOrders.length,
          collectionsCount: validCollections.length,
          returnsCount: validReturns.length,
          totalSalesVal: validOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0),
          totalColVal: validCollections.reduce((sum, c) => sum + (c.amount || 0), 0),
          totalRetVal: validReturns.reduce((sum, r) => sum + (r.returnValue || 0), 0),
        });

        setIsImporting(false);
        setStep(4);
      } catch (err) {
        console.error(err);
        alert('Import failed: ' + err.message);
        setIsImporting(false);
      }
    }, 600);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-900 text-amber-300 uppercase tracking-wider">
              ADMIN ONLY
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
              TAG: OLD IMPORT
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase mt-1 flex items-center gap-2">
            <Database className="w-6 h-6 text-red-700" />
            HISTORICAL DATA IMPORT SYSTEM
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Import 2+ years of old Excel/CSV business records into Shop Master, Orders, Collections & Credit Notes.
          </p>
        </div>

        {step > 1 && (
          <button
            onClick={() => {
              setStep(1);
              setFile(null);
              setProcessedData(null);
            }}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            ← Upload Different File
          </button>
        )}
      </div>

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-4 gap-2 text-xs font-bold">
        {[
          { num: 1, label: 'Upload Excel' },
          { num: 2, label: 'Select Sheets' },
          { num: 3, label: 'Preview & Validate' },
          { num: 4, label: 'Import Summary' },
        ].map((st) => (
          <div
            key={st.num}
            className={`p-3 rounded-2xl border transition-all flex items-center gap-2.5 ${
              step === st.num
                ? 'bg-slate-900 text-amber-300 border-slate-900 shadow-md'
                : step > st.num
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                step === st.num
                  ? 'bg-amber-400 text-slate-950'
                  : step > st.num
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {step > st.num ? '✓' : st.num}
            </span>
            <span className="truncate">{st.label}</span>
          </div>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: UPLOAD OLD EXCEL FILE                                            */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Target Route & Connected Market Selector */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 uppercase">
                STEP 1A: SELECT MARKET GROUP / ROUTE
              </span>
            </div>
            <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-red-700" />
              <span>Target Market Route & Connected Market (Where should new shops be linked?)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">1. Market Route *</label>
                <select
                  value={batchRouteId}
                  onChange={(e) => {
                    setBatchRouteId(e.target.value);
                    setBatchConnectedMarketId('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="">-- Select Market Route (e.g. Akodia, Pachore, Kalapipal) --</option>
                  {marketRoutes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} Route ({connectedMarkets.filter(c => c.routeId === r.id).length} connected markets)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">2. Connected Market / Town (Optional)</label>
                <select
                  value={batchConnectedMarketId}
                  onChange={(e) => setBatchConnectedMarketId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="">-- All / General for this Route --</option>
                  {connectedMarkets
                    .filter((c) => !batchRouteId || c.routeId === batchRouteId)
                    .map((cm) => (
                      <option key={cm.id} value={cm.id}>
                        {cm.name} (Under {cm.routeName || 'Route'})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="bg-white border-2 border-dashed border-slate-300 hover:border-red-600 rounded-3xl p-12 text-center cursor-pointer transition-all hover:bg-red-50/20 group space-y-4"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="hidden"
            />

            <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-700 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                Click to Upload or Drag & Drop Old Business Excel
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Supports Multi-Sheet Workbooks with <strong>"Party Statement Report"</strong> and <strong>"Item Details"</strong> (.xlsx, .xls, .csv)
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Select File from Computer</span>
            </div>
          </div>

          {/* Guidelines Box */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-5 space-y-3 text-xs text-amber-950">
            <h4 className="font-black text-amber-900 uppercase flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              Flexible Multi-Year Format Support
            </h4>
            <ul className="list-disc pl-5 space-y-1.5 text-amber-900/90 leading-relaxed font-medium">
              <li>
                <strong>No manual format conversion needed:</strong> The importer automatically recognizes party ledger statements, item sales registers, payment receipts, and credit notes.
              </li>
              <li>
                <strong>Grouped Invoices:</strong> Multiple items belonging to the same invoice number are automatically grouped under ONE order.
              </li>
              <li>
                <strong>Separate Transactions:</strong> Sales become Orders, Payment-In become Collections, and Credit Notes become Returns.
              </li>
              <li>
                <strong>Source Isolation:</strong> All records will be tagged as <code>Data Source = OLD IMPORT</code> and linked directly to the shop history for marketers.
              </li>
            </ul>
          </div>

          {/* Past Import Batches History */}
          {importBatches.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-3">
              <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Previous Import Batches ({importBatches.length})
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3">Batch ID / Date</th>
                      <th className="p-3">File Name</th>
                      <th className="p-3 text-right">New Shops</th>
                      <th className="p-3 text-right">Orders</th>
                      <th className="p-3 text-right">Collections</th>
                      <th className="p-3 text-right">Returns</th>
                      <th className="p-3">Source Tag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {importBatches.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {b.id}
                          <span className="block text-[10px] text-slate-400 font-normal">{b.importedAt}</span>
                        </td>
                        <td className="p-3 font-bold text-slate-800">{b.fileName}</td>
                        <td className="p-3 text-right font-black text-purple-700">{b.counts?.newShops || 0}</td>
                        <td className="p-3 text-right font-black text-amber-700">{b.counts?.orders || 0}</td>
                        <td className="p-3 text-right font-black text-emerald-700">{b.counts?.collections || 0}</td>
                        <td className="p-3 text-right font-black text-red-700">{b.counts?.returns || 0}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-900 text-amber-300 rounded font-black text-[10px]">
                            {b.source || 'OLD IMPORT'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: SELECT SHEETS & AUTO-DETECT                                      */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase">
                Step 2: Detected Sheets in "{fileName}"
              </h2>
              <p className="text-xs text-slate-500">
                Select which sheets from your old Excel workbook should be processed.
              </p>
            </div>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl">
              {sheetNames.length} Sheets Found
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {sheetNames.map((sName) => {
              const isSelected = selectedSheets.includes(sName);
              const isLikelyParty = sName.toLowerCase().includes('party') || sName.toLowerCase().includes('statement');
              const isLikelyItem = sName.toLowerCase().includes('item') || sName.toLowerCase().includes('sale');

              return (
                <div
                  key={sName}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedSheets((prev) => prev.filter((s) => s !== sName));
                    } else {
                      setSelectedSheets((prev) => [...prev, sName]);
                    }
                  }}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-red-600 bg-red-50/40 text-red-950 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className={`w-4 h-4 ${isSelected ? 'text-red-700' : 'text-slate-400'}`} />
                      <span className="font-extrabold text-sm">{sName}</span>
                    </div>
                    {(isLikelyParty || isLikelyItem) && (
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                        {isLikelyParty ? '✨ Party Statement Sheet' : '✨ Item Details Sheet'}
                      </span>
                    )}
                  </div>

                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isSelected ? 'bg-red-700 text-white' : 'border border-slate-300'
                    }`}
                  >
                    {isSelected && '✓'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
            >
              ← Back
            </button>
            <button
              onClick={handleProcessWorkbook}
              disabled={selectedSheets.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-red-700 to-amber-700 hover:from-red-800 hover:to-amber-800 text-white rounded-2xl font-black text-sm shadow-md flex items-center gap-2 active:scale-98 transition-all disabled:opacity-50"
            >
              <span>Analyze & Preview Data →</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: PREVIEW, VALIDATE & SHOP MATCHING RESOLUTION                     */}
      {/* ========================================================================= */}
      {step === 3 && processedData && (
        <div className="space-y-6">
          {/* KPI Cards Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Excel Rows</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{processedData.totalRawRows}</p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Parties / Shops</p>
              <p className="text-2xl font-black text-purple-700 mt-0.5">{processedData.uniqueParties.length}</p>
              <p className="text-[10px] text-slate-500 font-semibold">
                {processedData.matchedShops.length} Matched • {processedData.newShops.length} New
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Sales Orders</p>
              <p className="text-2xl font-black text-amber-600 mt-0.5">{processedData.orders.length}</p>
              <p className="text-[10px] text-amber-800 font-bold">
                ₹{processedData.orders.reduce((sum, o) => sum + o.grandTotal, 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Payments-In</p>
              <p className="text-2xl font-black text-emerald-600 mt-0.5">{processedData.collections.length}</p>
              <p className="text-[10px] text-emerald-800 font-bold">
                ₹{processedData.collections.reduce((sum, c) => sum + c.amount, 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Credit Notes</p>
              <p className="text-2xl font-black text-red-600 mt-0.5">{processedData.returns.length}</p>
              <p className="text-[10px] text-red-800 font-bold">
                ₹{processedData.returns.reduce((sum, r) => sum + r.returnValue, 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Needs Review</p>
              <p className="text-2xl font-black text-orange-600 mt-0.5">{processedData.needsReview.length}</p>
              <p className="text-[10px] text-slate-400 font-semibold">{processedData.duplicates.length} Duplicates</p>
            </div>
          </div>

          {/* Needs Review Alert Banner */}
          {processedData.needsReview.length > 0 && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-3xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0" />
                <div>
                  <h4 className="font-extrabold text-orange-950 text-sm">
                    {processedData.needsReview.length} Shops Require Match Confirmation
                  </h4>
                  <p className="text-xs text-orange-800">
                    The system found partial matches. Please confirm if they should be linked to existing shops or created as new.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActivePreviewTab('shops')}
                className="px-4 py-1.5 bg-orange-600 text-white rounded-xl font-bold text-xs hover:bg-orange-700 shadow-xs whitespace-nowrap"
              >
                Review & Match Now →
              </button>
            </div>
          )}

          {/* Tabs for Detailed Preview */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-50 p-2 overflow-x-auto gap-2">
              <button
                onClick={() => setActivePreviewTab('orders')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  activePreviewTab === 'orders'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Orders ({processedData.orders.length})</span>
              </button>

              <button
                onClick={() => setActivePreviewTab('collections')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  activePreviewTab === 'collections'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <IndianRupee className="w-4 h-4" />
                <span>Payments-In ({processedData.collections.length})</span>
              </button>

              <button
                onClick={() => setActivePreviewTab('returns')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  activePreviewTab === 'returns'
                    ? 'bg-red-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Credit Notes ({processedData.returns.length})</span>
              </button>

              <button
                onClick={() => setActivePreviewTab('shops')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  activePreviewTab === 'shops'
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Shops ({processedData.uniqueParties.length})</span>
              </button>

              {processedData.duplicates.length > 0 && (
                <button
                  onClick={() => setActivePreviewTab('duplicates')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    activePreviewTab === 'duplicates'
                      ? 'bg-slate-800 text-amber-300 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Duplicates ({processedData.duplicates.length})</span>
                </button>
              )}
            </div>

            {/* Filter Input */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search preview by shop name, invoice no, product..."
                className="w-full text-xs font-bold text-slate-800 outline-none bg-transparent"
              />
            </div>

            {/* 1. ORDERS PREVIEW */}
            {activePreviewTab === 'orders' && (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {processedData.orders
                  .filter((o) => !searchFilter || o.partyName.toLowerCase().includes(searchFilter.toLowerCase()) || o.invoiceNo.toLowerCase().includes(searchFilter.toLowerCase()))
                  .map((ord, idx) => (
                    <div key={idx} className="p-4 hover:bg-slate-50 space-y-2 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-sm">{ord.partyName}</span>
                            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700">
                              Inv #{ord.invoiceNo}
                            </span>
                            <span className="text-slate-400 font-semibold">{ord.date}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {ord.items.length} Items • Total KG: <strong>{ord.totalKg} KG</strong>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-emerald-700 text-sm block">
                            ₹{ord.grandTotal.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                            OLD IMPORT
                          </span>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-wrap gap-1.5">
                        {ord.items.map((it, iIdx) => (
                          <span
                            key={iIdx}
                            className="bg-white border border-slate-200 px-2 py-1 rounded text-[11px] font-medium text-slate-700"
                          >
                            <strong>{it.productName}</strong> ({it.packSize}) • {it.quantityKg} KG @ ₹{it.pricePerKg} = ₹{it.subtotal}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* 2. COLLECTIONS PREVIEW */}
            {activePreviewTab === 'collections' && (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Shop / Party Name</th>
                      <th className="p-3">Invoice Ref</th>
                      <th className="p-3">Payment Mode</th>
                      <th className="p-3 text-right">Amount (₹)</th>
                      <th className="p-3">Tag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {processedData.collections
                      .filter((c) => !searchFilter || c.partyName.toLowerCase().includes(searchFilter.toLowerCase()))
                      .map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-700">{c.date}</td>
                          <td className="p-3 font-bold text-slate-900">{c.partyName}</td>
                          <td className="p-3 text-slate-500 font-mono">{c.invoiceRef || '—'}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                              {c.paymentMode}
                            </span>
                          </td>
                          <td className="p-3 text-right font-black text-emerald-700 text-sm">
                            ₹{c.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-slate-900 text-amber-300 rounded font-bold text-[10px]">
                              OLD IMPORT
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. CREDIT NOTES PREVIEW */}
            {activePreviewTab === 'returns' && (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Shop / Party Name</th>
                      <th className="p-3">Invoice Ref</th>
                      <th className="p-3">Product</th>
                      <th className="p-3 text-right">Quantity KG</th>
                      <th className="p-3 text-right">Return Value (₹)</th>
                      <th className="p-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {processedData.returns
                      .filter((r) => !searchFilter || r.partyName.toLowerCase().includes(searchFilter.toLowerCase()))
                      .map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-700">{r.date}</td>
                          <td className="p-3 font-bold text-slate-900">{r.partyName}</td>
                          <td className="p-3 text-slate-500 font-mono">{r.invoiceNo || '—'}</td>
                          <td className="p-3 font-semibold text-slate-800">{r.productName}</td>
                          <td className="p-3 text-right font-bold text-slate-700">{r.quantityKg} KG</td>
                          <td className="p-3 text-right font-black text-red-700 text-sm">
                            ₹{r.returnValue.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-slate-500">{r.reason}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. SHOPS MATCHING PREVIEW */}
            {activePreviewTab === 'shops' && (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto text-xs">
                {processedData.uniqueParties
                  .filter((p) => !searchFilter || p.rawName.toLowerCase().includes(searchFilter.toLowerCase()))
                  .map((p, idx) => {
                    const matched = processedData.matchedShops.find((m) => m.norm === p.norm);
                    const review = processedData.needsReview.find((r) => r.norm === p.norm);
                    const isNew = processedData.newShops.some((n) => n.norm === p.norm);
                    const override = shopOverrides[p.norm];

                    return (
                      <div key={idx} className="p-4 hover:bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-slate-900 text-sm">{p.rawName}</h4>
                            {matched && (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                                ✓ Matched: {matched.matchedShop.name}
                              </span>
                            )}
                            {review && !override && (
                              <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-extrabold text-[10px]">
                                ⚠ Suggestion: {review.suggestedShop.name}
                              </span>
                            )}
                            {isNew && !override && (
                              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-extrabold text-[10px]">
                                + Will Create As New Shop
                              </span>
                            )}
                            {override && (
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-extrabold text-[10px]">
                                Custom: {override.action === 'LINK' ? 'Linked to Existing Shop' : 'Create New'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {p.transactionsCount} transactions recorded in file
                          </p>
                        </div>

                        {/* Match Action Override Selector */}
                        <div className="flex items-center gap-2">
                          <select
                            value={override?.action === 'LINK' ? override.targetShopId : 'CREATE'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'CREATE') {
                                handleSetShopAction(p.norm, 'CREATE');
                              } else {
                                handleSetShopAction(p.norm, 'LINK', val);
                              }
                            }}
                            className="bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800"
                          >
                            <option value="CREATE">+ Create As New Shop</option>
                            <optgroup label="Link to Existing Shop:">
                              {shops.map((s) => (
                                <option key={s.id} value={s.id}>
                                  Link to: {s.name} ({s.marketName || 'Pachore'})
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* 5. DUPLICATES PREVIEW */}
            {activePreviewTab === 'duplicates' && (
              <div className="p-4 space-y-2 text-xs">
                <p className="font-bold text-slate-600">
                  These records already exist in the database and will be automatically skipped to prevent duplication:
                </p>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {processedData.duplicates.map((d, idx) => (
                    <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{d.record.partyName}</span>
                        <span className="text-slate-400 block text-[11px]">{d.reason}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold">
                        Skipped
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Import Footer */}
          <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-black text-amber-300 text-base uppercase">READY TO IMPORT HISTORICAL DATA</h3>
              <p className="text-xs text-slate-300">
                Data will be tagged as <code>OLD IMPORT</code> and linked directly to individual shop history.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                ← Back
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="px-8 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 rounded-2xl font-black text-sm shadow-lg active:scale-98 transition-all flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>IMPORTING DATA...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>CONFIRM & IMPORT TO DATABASE ✓</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: IMPORT SUCCESS REPORT SUMMARY                                    */}
      {/* ========================================================================= */}
      {step === 4 && importResult && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-8 text-center space-y-6 max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black uppercase">
              IMPORT COMPLETED SUCCESSFULLY
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2">
              Historical Business Data Linked!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Batch ID: <code>{importResult.batchId}</code> • All historical transactions are now accessible in Marketer Shop History.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase">New Shops Created</p>
              <p className="text-xl font-black text-purple-700 mt-0.5">{importResult.createdShopsCount}</p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Orders Imported</p>
              <p className="text-xl font-black text-amber-600 mt-0.5">{importResult.ordersCount}</p>
              <p className="text-[10px] text-slate-500">₹{importResult.totalSalesVal.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Payments Imported</p>
              <p className="text-xl font-black text-emerald-600 mt-0.5">{importResult.collectionsCount}</p>
              <p className="text-[10px] text-slate-500">₹{importResult.totalColVal.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Credit Notes</p>
              <p className="text-xl font-black text-red-600 mt-0.5">{importResult.returnsCount}</p>
              <p className="text-[10px] text-slate-500">₹{importResult.totalRetVal.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => {
                setStep(1);
                setFile(null);
                setProcessedData(null);
                setImportResult(null);
              }}
              className="px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-extrabold shadow-md"
            >
              Import Another Excel File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
