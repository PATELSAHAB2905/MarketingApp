import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';

export default function OldDataImport({ onNavigate }) {
  const { currentUser } = useAuth();
  const {
    markets,
    shops,
    marketers,
    importBatches = [],
    importOldPartyData,
    getFormattedDate,
  } = useData();

  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'history'

  // Step 1: Selected Market
  const [selectedMarketId, setSelectedMarketId] = useState('');
  
  // Step 2 & 3: File and Parsed Preview
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [step, setStep] = useState(1); // 1: Market & Upload, 2: Preview, 3: Success

  // Duplicate Resolution State
  const [updateExistingDuplicates, setUpdateExistingDuplicates] = useState(true);

  // Success State
  const [lastImportSummary, setLastImportSummary] = useState(null);

  // Selected Market Object
  const selectedMarket = useMemo(() => {
    return markets.find((m) => m.id === selectedMarketId) || null;
  }, [markets, selectedMarketId]);

  // Past Old Party Import Batches
  const oldPartyBatches = useMemo(() => {
    return importBatches.filter((b) => b.dataType === 'old_parties');
  }, [importBatches]);

  // Selected Batch for viewing details in History
  const [viewingBatch, setViewingBatch] = useState(null);

  // ─────────────────────────────────────────────────────────────
  // 1. FILE UPLOAD & PARSING
  // ─────────────────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (!selectedMarketId) {
      alert('Kripya pehle Market select karein!');
      return;
    }

    setFile(uploadedFile);
    setFileName(uploadedFile.name);
    setIsAnalyzing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });

        if (!rawData || rawData.length === 0) {
          alert('Excel file khali hai!');
          setIsAnalyzing(false);
          return;
        }

        // Find header row (Scan first 10 rows)
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(10, rawData.length); i++) {
          const rowArr = rawData[i].map((c) => String(c).toLowerCase().trim());
          if (
            rowArr.some(
              (c) =>
                c.includes('name') ||
                c.includes('party') ||
                c.includes('customer') ||
                c.includes('receivable') ||
                c.includes('balance')
            )
          ) {
            headerRowIdx = i;
            break;
          }
        }

        const headerRow = rawData[headerRowIdx].map((c) => String(c).toLowerCase().trim());
        const colNameIdx = headerRow.findIndex((c) => c === 'name' || c.includes('party name') || c.includes('customer name') || c === 'party');
        const colEmailIdx = headerRow.findIndex((c) => c.includes('email') || c.includes('mail'));
        const colPhoneIdx = headerRow.findIndex((c) => c.includes('phone') || c.includes('mobile') || c.includes('contact'));
        const colRecIdx = headerRow.findIndex((c) => c.includes('receivable') || c.includes('debit') || c.includes('opening balance') || c.includes('balance'));
        const colPayIdx = headerRow.findIndex((c) => c.includes('payable') || c.includes('credit'));

        const cleanNumber = (val) => {
          if (val === undefined || val === null || val === '') return 0;
          const num = Number(String(val).replace(/[^0-9.-]/g, ''));
          return isNaN(num) ? 0 : num;
        };

        const rows = [];
        const normalize = (txt) => String(txt || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        for (let r = headerRowIdx + 1; r < rawData.length; r++) {
          const rowArr = rawData[r];
          if (!rowArr || rowArr.length === 0) continue;

          const rawName = colNameIdx !== -1 ? String(rowArr[colNameIdx] || '').trim() : String(rowArr[0] || '').trim();
          
          // Skip empty or summary rows
          if (!rawName || rawName.toLowerCase().startsWith('total') || rawName.toLowerCase().startsWith('grand total')) {
            continue;
          }

          const email = colEmailIdx !== -1 ? String(rowArr[colEmailIdx] || '').trim() : '';
          const phone = colPhoneIdx !== -1 ? String(rowArr[colPhoneIdx] || '').replace(/[^0-9]/g, '').trim() : '';
          const recBal = colRecIdx !== -1 ? cleanNumber(rowArr[colRecIdx]) : 0;
          const payBal = colPayIdx !== -1 ? cleanNumber(rowArr[colPayIdx]) : 0;

          // Duplicate Check: Check by Phone OR (Normalized Name in this market)
          const normName = normalize(rawName);
          const existingShop = shops.find((s) => {
            if (phone && s.mobile && s.mobile.replace(/[^0-9]/g, '') === phone) return true;
            if (normalize(s.name) === normName && s.marketId === selectedMarketId) return true;
            return false;
          });

          rows.push({
            id: `row-${r}`,
            name: rawName,
            email,
            phone,
            receivableBalance: recBal,
            payableBalance: payBal,
            isExisting: !!existingShop,
            existingShopId: existingShop?.id || null,
            existingShopName: existingShop?.name || null,
            status: existingShop ? 'EXISTING' : 'NEW',
          });
        }

        setParsedRows(rows);
        setIsAnalyzing(false);
        setStep(2);
      } catch (err) {
        console.error(err);
        alert('File read karne mein error: ' + err.message);
        setIsAnalyzing(false);
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  // ─────────────────────────────────────────────────────────────
  // 2. PREVIEW METRICS
  // ─────────────────────────────────────────────────────────────
  const previewMetrics = useMemo(() => {
    let totalRec = 0;
    let totalPay = 0;
    let newCount = 0;
    let existingCount = 0;

    parsedRows.forEach((r) => {
      totalRec += r.receivableBalance;
      totalPay += r.payableBalance;
      if (r.isExisting) existingCount++;
      else newCount++;
    });

    return {
      totalParties: parsedRows.length,
      totalRec,
      totalPay,
      newCount,
      existingCount,
    };
  }, [parsedRows]);

  // ─────────────────────────────────────────────────────────────
  // 3. CONFIRM IMPORT
  // ─────────────────────────────────────────────────────────────
  const handleConfirmImport = () => {
    if (!selectedMarket || parsedRows.length === 0) return;

    const updateExistingIds = updateExistingDuplicates
      ? parsedRows.filter((r) => r.isExisting && r.existingShopId).map((r) => r.existingShopId)
      : [];

    const batch = importOldPartyData({
      marketId: selectedMarket.id,
      marketName: selectedMarket.name,
      importedBy: currentUser?.name || 'Admin',
      fileName: fileName || 'Party_Data.xlsx',
      parties: parsedRows,
      updateExistingIds,
    });

    setLastImportSummary(batch);
    setStep(3);
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'Name': 'Balaji Kirana Akodia',
        'Email': 'balaji@gmail.com',
        'Phone No.': '9826388415',
        'Receivable Balance': 4312,
        'Payable Balance': 0,
      },
      {
        'Name': 'Chowdhury Mart Akodia',
        'Email': '',
        'Phone No.': '9826388416',
        'Receivable Balance': 4367,
        'Payable Balance': 0,
      },
      {
        'Name': 'Abdul Aziz Kirana Akodiya',
        'Email': '',
        'Phone No.': '9826388421',
        'Receivable Balance': 0,
        'Payable Balance': 0,
      },
      {
        'Name': 'Dulichand Traders Akodia',
        'Email': '',
        'Phone No.': '9826388417',
        'Receivable Balance': 2348,
        'Payable Balance': 0,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sample_Parties');
    XLSX.writeFile(wb, 'Old_Party_Data_Template.xlsx');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-slate-800">
      
      {/* 1. Header & Navigation Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              OLD PARTY DATA IMPORT
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black uppercase">
              Market-Linked
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Upload old customer balance files, link to Markets, and automatically sync to Marketer Dashboards
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('import');
              setStep(1);
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
              activeTab === 'import'
                ? 'bg-red-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📥 Import New File
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
              activeTab === 'history'
                ? 'bg-red-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📜 Import History ({oldPartyBatches.length})
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: IMPORT WIZARD                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          
          {/* STEP 1: SELECT MARKET & UPLOAD FILE */}
          {step === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Form Setup */}
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
                
                {/* Step 1: Select Market (Mandatory) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-red-700" />
                      <span>STEP 1: SELECT MARKET (MANDATORY) *</span>
                    </label>
                    <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-md">
                      Required
                    </span>
                  </div>

                  <select
                    value={selectedMarketId}
                    onChange={(e) => setSelectedMarketId(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-red-600 rounded-2xl p-3 text-sm font-black text-slate-900 focus:ring-2 focus:ring-red-600 transition-all cursor-pointer"
                  >
                    <option value="">-- Choose Distribution Market from Master --</option>
                    {markets.map((m) => (
                      <option key={m.id} value={m.id}>
                        📍 {m.name} ({m.district || 'Market'}) — Assigned: {m.assignedMarketerName || 'Unassigned'}
                      </option>
                    ))}
                  </select>

                  {selectedMarket && (
                    <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-extrabold text-amber-950 block">
                          Selected: {selectedMarket.name} Market
                        </span>
                        <span className="text-[11px] text-amber-800">
                          Assigned Marketer: <strong>{selectedMarket.assignedMarketerName || 'Not Assigned'}</strong>
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-200/60 text-amber-900 rounded-lg font-black text-[10px]">
                        Market ID: {selectedMarket.id}
                      </span>
                    </div>
                  )}
                </div>

                {/* Step 2: Upload File Area */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-red-700" />
                    <span>STEP 2: UPLOAD OLD PARTY DATA (EXCEL / CSV)</span>
                  </label>

                  <div
                    className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
                      !selectedMarketId
                        ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                        : 'border-red-300 bg-red-50/30 hover:bg-red-50/60 cursor-pointer'
                    }`}
                  >
                    <input
                      type="file"
                      id="old-party-file-input"
                      disabled={!selectedMarketId || isAnalyzing}
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <label
                      htmlFor="old-party-file-input"
                      className={`space-y-3 block ${!selectedMarketId ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto shadow-xs">
                        <FileSpreadsheet className="w-7 h-7" />
                      </div>

                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {selectedMarketId ? 'Click to Choose Excel / CSV File' : '⚠️ Please select a Market first'}
                        </p>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Supported formats: <strong>.xlsx, .xls, .csv</strong>
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-amber-300 rounded-xl text-xs font-bold shadow-xs">
                        <span>Select File from Computer</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Guidelines */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1 text-xs text-slate-600">
                  <h4 className="font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Expected Columns & Rules:</span>
                  </h4>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] font-medium text-slate-600">
                    <li>Columns: <code>Name</code>, <code>Email</code>, <code>Phone No.</code>, <code>Receivable Balance</code>, <code>Payable Balance</code>.</li>
                    <li>Zero balance parties (₹0 Receivable & ₹0 Payable) are fully valid and imported.</li>
                    <li>Blank rows and total summary rows are automatically ignored.</li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Template & Info */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-slate-900 to-amber-950 text-white p-5 rounded-3xl space-y-4 shadow-md">
                  <div>
                    <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest block">
                      EXCEL TEMPLATE
                    </span>
                    <h3 className="text-base font-black mt-0.5">Download Sample File</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Download the pre-formatted Excel template with sample Akodia customer records.
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full py-2.5 px-3 bg-amber-400 hover:bg-amber-500 text-red-950 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Excel Template (.xlsx)</span>
                  </button>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3 text-xs">
                  <h4 className="font-black text-slate-900 uppercase">How Market Linking Works:</h4>
                  <div className="space-y-2 text-[11px] text-slate-600 font-medium leading-relaxed">
                    <p>
                      <strong>1. Party → Market:</strong> Har party sirf selected Market ID se link hogi.
                    </p>
                    <p>
                      <strong>2. Market → Marketer:</strong> Jab Admin Market Master mein us Market ko kisi Marketer ko assign karega (e.g. <code>Akodia → Sachin</code>), to us market ki saari parties automatically Sachin ke dashboard par aa jayengi.
                    </p>
                    <p>
                      <strong>3. Easy Reassignment:</strong> Market doosre marketer ko reassign karne par parties automatic shift ho jayengi!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW BEFORE IMPORT */}
          {step === 2 && (
            <div className="space-y-6">
              
              {/* Top Preview Summary Cards */}
              <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                      PREVIEW BEFORE IMPORT
                    </span>
                    <h2 className="text-xl font-black text-white mt-0.5">
                      Market: {selectedMarket?.name}
                    </h2>
                    <p className="text-xs text-slate-300">
                      File: <strong>{fileName}</strong> • Assigned Marketer: <strong>{selectedMarket?.assignedMarketerName || 'Unassigned'}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStep(1)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                    >
                      ← Change File
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg active:scale-95 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Import ({previewMetrics.totalParties} Parties)</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Parties</span>
                    <span className="text-xl font-black text-white">{previewMetrics.totalParties}</span>
                  </div>
                  <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Receivable</span>
                    <span className="text-xl font-black text-amber-400">
                      ₹{previewMetrics.totalRec.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Payable</span>
                    <span className="text-xl font-black text-emerald-400">
                      ₹{previewMetrics.totalPay.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">New vs Existing</span>
                    <span className="text-base font-black text-slate-200">
                      {previewMetrics.newCount} New • {previewMetrics.existingCount} Existing
                    </span>
                  </div>
                </div>

                {/* Duplicate Handling Toggle */}
                {previewMetrics.existingCount > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span className="text-amber-200 font-semibold">
                        {previewMetrics.existingCount} existing party match found in database.
                      </span>
                    </div>

                    <div
                      onClick={() => setUpdateExistingDuplicates(!updateExistingDuplicates)}
                      className="flex items-center gap-2 cursor-pointer bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700"
                    >
                      {updateExistingDuplicates ? (
                        <CheckSquare className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="text-xs font-bold text-white">
                        {updateExistingDuplicates ? 'Update Existing Balance' : 'Skip Existing Parties'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-sm font-black text-slate-900 uppercase">
                    Data Rows Preview ({parsedRows.length})
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    Market ID: <code>{selectedMarket?.id}</code>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-black uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3">Party Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Phone No.</th>
                        <th className="p-3 text-right">Receivable (₹)</th>
                        <th className="p-3 text-right">Payable (₹)</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {parsedRows.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-3 font-extrabold text-slate-900">{row.name}</td>
                          <td className="p-3 text-slate-500">{row.email || '—'}</td>
                          <td className="p-3 font-mono text-slate-700">{row.phone || '—'}</td>
                          <td className="p-3 text-right font-black text-slate-900">
                            ₹{row.receivableBalance.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-black text-emerald-700">
                            ₹{row.payableBalance.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                row.status === 'NEW'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS SCREEN */}
          {step === 3 && lastImportSummary && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-2xl mx-auto text-center space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full font-black text-xs uppercase tracking-wider inline-block mb-2">
                  Import Completed Successfully!
                </span>
                <h2 className="text-2xl font-black text-slate-900">
                  {lastImportSummary.totalParties} Parties Added for {lastImportSummary.marketName}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Batch ID: <code>{lastImportSummary.id}</code> • {lastImportSummary.importDate} at {lastImportSummary.importTime}
                </p>
              </div>

              {/* Summary Metrics Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">New Parties</span>
                  <span className="font-black text-emerald-700 text-lg">{lastImportSummary.newParties}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Updated Parties</span>
                  <span className="font-black text-amber-700 text-lg">{lastImportSummary.updatedParties}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Receivable</span>
                  <span className="font-black text-red-700 text-lg">
                    ₹{lastImportSummary.totalReceivable.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Payable</span>
                  <span className="font-black text-slate-800 text-lg">
                    ₹{lastImportSummary.totalPayable.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Confirmation Notice */}
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs text-emerald-900 font-semibold">
                ✓ All parties are linked to Market <strong>{lastImportSummary.marketName}</strong> and are now active for Orders, Collections, Returns, and Marketer Visits!
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => {
                    setStep(1);
                    setParsedRows([]);
                    setFile(null);
                    setFileName('');
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs"
                >
                  Import Another File
                </button>

                <button
                  onClick={() => setActiveTab('history')}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs"
                >
                  View Import History
                </button>

                {onNavigate && (
                  <button
                    onClick={() => onNavigate('shops')}
                    className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl font-black text-xs shadow-md"
                  >
                    View in Shops Master →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: IMPORT HISTORY                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-3">
            <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-700" />
              <span>Old Party Import History Batches ({oldPartyBatches.length})</span>
            </h3>

            {oldPartyBatches.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-bold text-slate-700">No Import Batches Recorded</p>
                <p className="text-xs text-slate-400">Upload your first Old Party Excel file above to see history.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Import Date / Batch</th>
                      <th className="p-3">Market</th>
                      <th className="p-3">File Name</th>
                      <th className="p-3 text-right">Total Parties</th>
                      <th className="p-3 text-right">New / Updated</th>
                      <th className="p-3 text-right">Total Receivable</th>
                      <th className="p-3 text-right">Total Payable</th>
                      <th className="p-3">Imported By</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {oldPartyBatches.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {b.id}
                          <span className="block text-[10px] text-slate-400 font-normal">{b.importDate} {b.importTime}</span>
                        </td>
                        <td className="p-3 font-extrabold text-slate-900 text-sm">
                          {b.marketName}
                        </td>
                        <td className="p-3 font-bold text-slate-700">{b.fileName}</td>
                        <td className="p-3 text-right font-black text-purple-700 text-sm">
                          {b.totalParties}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-600">
                          {b.newParties} New / {b.updatedParties} Upd
                        </td>
                        <td className="p-3 text-right font-black text-red-700">
                          ₹{(b.totalReceivable || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-black text-emerald-700">
                          ₹{(b.totalPayable || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-slate-600 font-semibold">{b.importedBy || 'Admin'}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black text-[10px]">
                            {b.status || 'Completed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
