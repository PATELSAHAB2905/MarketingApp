import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import ShopHistoryModal from '../../components/common/ShopHistoryModal';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Filter,
  Calendar,
  Users,
  Store,
  MapPin,
  IndianRupee,
  ShoppingBag,
  RotateCcw,
  TrendingUp,
  Target,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Eye,
  Search,
  RefreshCw,
  Plus,
  Edit2,
  X,
  FileText,
  BarChart2,
  Activity,
  Award,
  Layers,
  Check,
} from 'lucide-react';
import {
  parseDateToComparable,
  formatIsoToDisplay,
  isShopMatchingRecord,
  calculatePartyLedger,
} from '../../utils/partyLedgerHelper';

// Helper to format ISO Date (YYYY-MM-DD) to Display (DD-MM-YYYY)
const isoToDisplay = (isoStr) => {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return isoStr;
};

// Helper to get Day of Week Name
const getDayName = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
};

// Helper for formatting duration
const formatDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return '—';
  try {
    const parseTime = (tStr) => {
      const match = tStr.match(/(\d+):(\d+)(?:\s*(AM|PM))?/i);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3] ? match[3].toUpperCase() : null;
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };
    const sMin = parseTime(startTime);
    const eMin = parseTime(endTime);
    if (sMin == null || eMin == null || eMin < sMin) return '—';
    const diff = eMin - sMin;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hrs}h ${mins}m`;
  } catch {
    return '—';
  }
};

export default function MdoReport() {
  const {
    marketers,
    markets,
    shops,
    orders,
    collections,
    returns,
    visits,
    checkIns = [],
    targets,
    weeklyRoutes,
    tempAssignments,
    getFormattedDate,
    getShopOutstanding,
    updateTarget,
    addTarget,
  } = useData();

  // Current anchor date (e.g. today's date in DD-MM-YYYY)
  const todayStr = getFormattedDate();
  const todayIso = parseDateToComparable(todayStr) || new Date().toISOString().split('T')[0];

  // Filters State
  const [selectedMdoId, setSelectedMdoId] = useState('ALL');
  const [selectedMarketId, setSelectedMarketId] = useState('ALL');
  const [datePreset, setDatePreset] = useState('30_DAYS'); // 'TODAY' | 'YESTERDAY' | '7_DAYS' | '30_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'
  const [customFromIso, setCustomFromIso] = useState(() => {
    const d = new Date(todayIso);
    d.setDate(d.getDate() - 29);
    return d.toISOString().split('T')[0];
  });
  const [customToIso, setCustomToIso] = useState(todayIso);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('DAILY'); // 'DAILY' | 'TARGET' | 'MARKET' | 'PARTIES' | 'CHARTS'

  // Modals state
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);
  const [selectedMarketDetail, setSelectedMarketDetail] = useState(null);
  const [historyShop, setHistoryShop] = useState(null);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [editingTargetMdo, setEditingTargetMdo] = useState(null);
  const [targetFormData, setTargetFormData] = useState({
    dailyKg: 130,
    dailyCollection: 25000,
    dailyVisits: 30,
    dailyNewCustomers: 3,
    monthlyKg: 2800,
    monthlyCollection: 540000,
    monthlyVisits: 650,
    monthlyNewCustomers: 60,
  });

  // Calculate Active Date Range based on Preset
  const { fromDateIso, toDateIso, rangeLabel } = useMemo(() => {
    const anchor = new Date(todayIso);
    const pad = (n) => String(n).padStart(2, '0');
    const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (datePreset === 'TODAY') {
      return { fromDateIso: todayIso, toDateIso: todayIso, rangeLabel: `Today (${isoToDisplay(todayIso)})` };
    }
    if (datePreset === 'YESTERDAY') {
      const y = new Date(anchor);
      y.setDate(anchor.getDate() - 1);
      const yIso = toIso(y);
      return { fromDateIso: yIso, toDateIso: yIso, rangeLabel: `Yesterday (${isoToDisplay(yIso)})` };
    }
    if (datePreset === '7_DAYS') {
      const s = new Date(anchor);
      s.setDate(anchor.getDate() - 6);
      const sIso = toIso(s);
      return { fromDateIso: sIso, toDateIso: todayIso, rangeLabel: `Last 7 Days (${isoToDisplay(sIso)} to ${isoToDisplay(todayIso)})` };
    }
    if (datePreset === 'THIS_MONTH') {
      const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const sIso = toIso(start);
      return { fromDateIso: sIso, toDateIso: todayIso, rangeLabel: `This Month (${isoToDisplay(sIso)} to ${isoToDisplay(todayIso)})` };
    }
    if (datePreset === 'LAST_MONTH') {
      const start = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
      const end = new Date(anchor.getFullYear(), anchor.getMonth(), 0);
      const sIso = toIso(start);
      const eIso = toIso(end);
      return { fromDateIso: sIso, toDateIso: eIso, rangeLabel: `Last Month (${isoToDisplay(sIso)} to ${isoToDisplay(eIso)})` };
    }
    if (datePreset === 'CUSTOM') {
      const f = customFromIso || todayIso;
      const t = customToIso || todayIso;
      return { fromDateIso: f, toDateIso: t, rangeLabel: `Custom (${isoToDisplay(f)} to ${isoToDisplay(t)})` };
    }

    // Default: Rolling Last 30 Days
    const d30 = new Date(anchor);
    d30.setDate(anchor.getDate() - 29);
    const d30Iso = toIso(d30);
    return { fromDateIso: d30Iso, toDateIso: todayIso, rangeLabel: `Last 30 Days (${isoToDisplay(d30Iso)} to ${isoToDisplay(todayIso)})` };
  }, [datePreset, customFromIso, customToIso, todayIso]);

  // Generate All Consecutive Dates Array in Period (No skipped dates!)
  const periodDatesIso = useMemo(() => {
    const list = [];
    if (!fromDateIso || !toDateIso) return list;
    const curr = new Date(fromDateIso);
    const end = new Date(toDateIso);
    const pad = (n) => String(n).padStart(2, '0');
    const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    while (curr <= end) {
      list.push(toIso(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return list;
  }, [fromDateIso, toDateIso]);

  // Filtered MDOs list
  const activeMdos = useMemo(() => {
    if (selectedMdoId === 'ALL') return marketers;
    return marketers.filter((m) => m.id === selectedMdoId);
  }, [marketers, selectedMdoId]);

  // Helper to match MDO identity
  const isRecordForMdo = (rec, mdo) => {
    if (!rec || !mdo) return false;
    if (rec.marketerId && rec.marketerId === mdo.id) return true;
    if (rec.mdoId && rec.mdoId === mdo.id) return true;
    if (rec.marketerName && mdo.name && rec.marketerName.toLowerCase().trim() === mdo.name.toLowerCase().trim()) return true;
    return false;
  };

  // Planned Market resolver for an MDO on a specific date
  const getPlannedMarketForMdo = (mdo, isoDate) => {
    if (!mdo || !isoDate) return '—';
    const displayDate = isoToDisplay(isoDate);

    // 1. Check temporary assignment override
    const temp = tempAssignments?.find(
      (t) => (t.marketerId === mdo.id || t.assignedMarketerId === mdo.id) && (t.date === displayDate || t.date === isoDate)
    );
    if (temp) {
      return { name: temp.marketName || 'Assigned Market', isOverride: true, note: temp.reason || 'Temp Override' };
    }

    // 2. Check weekly schedule by Day of Week
    const dObj = new Date(isoDate);
    const dayOfWeek = dObj.getDay(); // 0 is Sunday, 1 is Monday...
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayMap[dayOfWeek];

    const weekly = weeklyRoutes?.find(
      (w) => (w.marketerId === mdo.id || w.assignedMarketerId === mdo.id) && (w.day === dayName || w.dayOfWeek === dayOfWeek)
    );
    if (weekly && weekly.marketName) {
      return { name: weekly.marketName, isOverride: false, note: `${dayName} Fixed Route` };
    }

    // 3. Fallback to MDO's primary assigned market
    const primary = markets.find((m) => m.assignedMarketerId === mdo.id || m.id === mdo.assignedMarketId);
    if (primary) {
      return { name: primary.name, isOverride: false, note: 'Primary Market' };
    }

    return { name: mdo.assignedMarketName || 'Assigned Area', isOverride: false, note: 'General' };
  };

  // Build Comprehensive Daily Matrix for all dates & MDOs in period
  const dailyMatrixData = useMemo(() => {
    const rows = [];

    periodDatesIso.forEach((dateIso) => {
      const displayDate = isoToDisplay(dateIso);
      const dayName = getDayName(dateIso);

      activeMdos.forEach((mdo) => {
        // Attendance / Check-In Record for this MDO on this date
        const checkInRecord = checkIns.find(
          (c) => isRecordForMdo(c, mdo) && (parseDateToComparable(c.date || c.createdDate) === dateIso)
        );

        // Visits on this date
        const dayVisits = visits.filter(
          (v) => isRecordForMdo(v, mdo) && (parseDateToComparable(v.date || v.createdDate) === dateIso)
        );

        // Orders on this date
        const dayOrders = orders.filter(
          (o) => isRecordForMdo(o, mdo) && (parseDateToComparable(o.date || o.createdDate) === dateIso)
        );

        // Collections on this date
        const dayCollections = collections.filter(
          (c) => isRecordForMdo(c, mdo) && (parseDateToComparable(c.date || c.createdDate) === dateIso)
        );

        // Returns on this date
        const dayReturns = returns.filter(
          (r) => isRecordForMdo(r, mdo) && (parseDateToComparable(r.date || r.createdDate) === dateIso)
        );

        // New Parties registered/created on this date by or for this MDO
        const dayNewParties = shops.filter(
          (s) => (s.createdDate === displayDate || parseDateToComparable(s.createdDate) === dateIso) &&
            (s.assignedMarketerId === mdo.id || dayVisits.some((v) => v.shopId === s.id && v.isNewShop))
        );

        // Planned Market
        const planMarketObj = getPlannedMarketForMdo(mdo, dateIso);

        // Actual Market
        const actualMarketName =
          checkInRecord?.marketName ||
          (dayVisits[0]?.marketName) ||
          (dayOrders[0]?.marketName) ||
          (checkInRecord ? planMarketObj.name : '—');

        // Filter by selectedMarketId if specified
        if (selectedMarketId !== 'ALL') {
          const mObj = markets.find((m) => m.id === selectedMarketId);
          const mName = mObj?.name?.toLowerCase().trim();
          const matchPlan = planMarketObj.name.toLowerCase().trim() === mName;
          const matchActual = actualMarketName.toLowerCase().trim() === mName;
          if (!matchPlan && !matchActual) return;
        }

        // Attendance Status
        let attendanceStatus = 'Absent';
        let attendanceBadge = 'bg-slate-100 text-slate-500 border-slate-200';
        let isPresent = false;

        if (checkInRecord) {
          isPresent = true;
          if (checkInRecord.status === 'ACTIVE' && (checkInRecord.endTime || checkInRecord.isDayEnded)) {
            attendanceStatus = 'Present (Completed)';
            attendanceBadge = 'bg-emerald-50 text-emerald-800 border-emerald-300';
          } else if (checkInRecord.status === 'ACTIVE' && !checkInRecord.endTime && !checkInRecord.isDayEnded) {
            attendanceStatus = 'Day In Progress';
            attendanceBadge = 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse';
          } else if (checkInRecord.status === 'INACTIVE' || checkInRecord.isDayEnded) {
            attendanceStatus = 'Present';
            attendanceBadge = 'bg-emerald-50 text-emerald-800 border-emerald-300';
          } else {
            attendanceStatus = 'Present';
            attendanceBadge = 'bg-emerald-50 text-emerald-800 border-emerald-300';
          }
        } else if (dayVisits.length > 0 || dayOrders.length > 0 || dayCollections.length > 0) {
          isPresent = true;
          attendanceStatus = 'Field Active (No Check-In)';
          attendanceBadge = 'bg-blue-50 text-blue-800 border-blue-300';
        }

        // Calculations
        const totalVisitsCount = dayVisits.length;
        const totalNewPartiesCount = Math.max(
          dayNewParties.length,
          dayVisits.filter((v) => v.isNewShop).length
        );
        const totalOrdersCount = dayOrders.length;
        const totalSalesKg = dayOrders.reduce((sum, o) => sum + Number(o.totalKg || 0), 0);
        const totalSalesAmount = dayOrders.reduce((sum, o) => sum + Number(o.grandTotal || o.totalValue || o.subtotal || 0), 0);
        const totalCollectionAmount = dayCollections.reduce((sum, c) => sum + Number(c.amount || 0), 0);
        const totalReturnAmount = dayReturns.reduce((sum, r) => sum + Number(r.returnValue || r.amount || 0), 0);
        const totalReturnKg = dayReturns.reduce((sum, r) => sum + Number(r.returnKg || r.quantity || 0), 0);

        // MDO Target for comparison
        const mdoTarget = targets.find((t) => t.marketerId === mdo.id) || {
          dailyKg: 130,
          dailyCollection: 25000,
          dailyVisits: 30,
          dailyNewCustomers: 3,
        };

        const targetKg = Number(mdoTarget.dailyKg || 0);
        const targetColl = Number(mdoTarget.dailyCollection || 0);
        const targetVisits = Number(mdoTarget.dailyVisits || 0);

        const kgAchievementPct = targetKg > 0 ? Math.round((totalSalesKg / targetKg) * 100) : null;
        const collAchievementPct = targetColl > 0 ? Math.round((totalCollectionAmount / targetColl) * 100) : null;

        // Working time
        const startTime = checkInRecord?.startTime || checkInRecord?.createdTime || (dayVisits[0]?.time) || '—';
        const endTime = checkInRecord?.endTime || (checkInRecord?.sessions?.[0]?.endTime) || (checkInRecord?.isDayEnded ? 'Day Ended' : '—');
        const workingHours = formatDuration(startTime, endTime);

        // Search Query filter
        if (searchQuery) {
          const q = searchQuery.toLowerCase().trim();
          const matchMdo = mdo.name.toLowerCase().includes(q);
          const matchPlan = planMarketObj.name.toLowerCase().includes(q);
          const matchActual = actualMarketName.toLowerCase().includes(q);
          const matchDate = displayDate.includes(q) || dateIso.includes(q);
          if (!matchMdo && !matchPlan && !matchActual && !matchDate) return;
        }

        rows.push({
          dateIso,
          displayDate,
          dayName,
          mdoId: mdo.id,
          mdoName: mdo.name,
          mdoRole: mdo.role || 'MDO',
          planMarket: planMarketObj.name,
          planMarketNote: planMarketObj.note,
          isOverride: planMarketObj.isOverride,
          actualMarket: actualMarketName,
          attendanceStatus,
          attendanceBadge,
          isPresent,
          startTime,
          endTime,
          workingHours,
          totalVisitsCount,
          totalNewPartiesCount,
          totalOrdersCount,
          totalSalesKg,
          totalSalesAmount,
          totalCollectionAmount,
          totalReturnAmount,
          totalReturnKg,
          targetKg,
          targetColl,
          targetVisits,
          kgAchievementPct,
          collAchievementPct,
          checkInRecord,
          dayVisits,
          dayOrders,
          dayCollections,
          dayReturns,
          dayNewParties,
        });
      });
    });

    return rows.sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  }, [periodDatesIso, activeMdos, checkIns, visits, orders, collections, returns, shops, targets, markets, weeklyRoutes, tempAssignments, selectedMarketId, searchQuery]);

  // Executive Summary Aggregates
  const executiveSummary = useMemo(() => {
    const totalWorkingDaysInPeriod = periodDatesIso.length;
    const presentRows = dailyMatrixData.filter((r) => r.isPresent);
    const presentDaysCount = new Set(presentRows.map((r) => `${r.dateIso}_${r.mdoId}`)).size;
    const totalMdoDays = periodDatesIso.length * activeMdos.length;
    const absentDaysCount = Math.max(0, totalMdoDays - presentDaysCount);

    const distinctMarketsCovered = new Set(
      dailyMatrixData
        .filter((r) => r.actualMarket && r.actualMarket !== '—')
        .map((r) => r.actualMarket.toLowerCase().trim())
    ).size;

    const totalShopVisits = dailyMatrixData.reduce((s, r) => s + r.totalVisitsCount, 0);
    const totalNewParties = dailyMatrixData.reduce((s, r) => s + r.totalNewPartiesCount, 0);
    const totalOrders = dailyMatrixData.reduce((s, r) => s + r.totalOrdersCount, 0);
    const totalSalesKg = dailyMatrixData.reduce((s, r) => s + r.totalSalesKg, 0);
    const totalSalesAmount = dailyMatrixData.reduce((s, r) => s + r.totalSalesAmount, 0);
    const totalCollection = dailyMatrixData.reduce((s, r) => s + r.totalCollectionAmount, 0);
    const totalReturnsAmount = dailyMatrixData.reduce((s, r) => s + r.totalReturnAmount, 0);
    const totalReturnsKg = dailyMatrixData.reduce((s, r) => s + r.totalReturnKg, 0);

    const totalTargetKg = dailyMatrixData.reduce((s, r) => s + r.targetKg, 0);
    const totalTargetCollection = dailyMatrixData.reduce((s, r) => s + r.targetColl, 0);
    const totalTargetVisits = dailyMatrixData.reduce((s, r) => s + r.targetVisits, 0);

    const overallKgAchievementPct = totalTargetKg > 0 ? Math.round((totalSalesKg / totalTargetKg) * 100) : null;
    const overallCollAchievementPct = totalTargetCollection > 0 ? Math.round((totalCollection / totalTargetCollection) * 100) : null;
    const overallVisitAchievementPct = totalTargetVisits > 0 ? Math.round((totalShopVisits / totalTargetVisits) * 100) : null;

    return {
      totalWorkingDaysInPeriod,
      presentDaysCount,
      absentDaysCount,
      totalMdoDays,
      distinctMarketsCovered,
      totalShopVisits,
      totalNewParties,
      totalOrders,
      totalSalesKg,
      totalSalesAmount,
      totalCollection,
      totalReturnsAmount,
      totalReturnsKg,
      totalTargetKg,
      totalTargetCollection,
      totalTargetVisits,
      overallKgAchievementPct,
      overallCollAchievementPct,
      overallVisitAchievementPct,
    };
  }, [dailyMatrixData, periodDatesIso, activeMdos]);

  // Market-Wise Performance Aggregates
  const marketWiseData = useMemo(() => {
    return markets.map((m) => {
      const mNorm = m.name.toLowerCase().trim();
      const marketDailyRows = dailyMatrixData.filter(
        (r) => (r.actualMarket && r.actualMarket.toLowerCase().trim() === mNorm) ||
          (r.planMarket && r.planMarket.toLowerCase().trim() === mNorm)
      );

      const workingDays = new Set(marketDailyRows.filter((r) => r.isPresent).map((r) => r.dateIso)).size;
      const totalVisits = marketDailyRows.reduce((s, r) => s + r.totalVisitsCount, 0);
      const totalNewParties = marketDailyRows.reduce((s, r) => s + r.totalNewPartiesCount, 0);
      const totalOrdersCount = marketDailyRows.reduce((s, r) => s + r.totalOrdersCount, 0);
      const totalSalesKg = marketDailyRows.reduce((s, r) => s + r.totalSalesKg, 0);
      const totalSalesAmount = marketDailyRows.reduce((s, r) => s + r.totalSalesAmount, 0);
      const totalCollection = marketDailyRows.reduce((s, r) => s + r.totalCollectionAmount, 0);
      const totalReturns = marketDailyRows.reduce((s, r) => s + r.totalReturnAmount, 0);

      const marketShops = shops.filter(
        (s) => s.marketId === m.id || (s.marketName && s.marketName.toLowerCase().trim() === mNorm)
      );

      const visitedShopIds = new Set(
        visits
          .filter((v) => {
            const iso = parseDateToComparable(v.date || v.createdDate);
            return iso >= fromDateIso && iso <= toDateIso && (v.marketId === m.id || (v.marketName && v.marketName.toLowerCase().trim() === mNorm));
          })
          .map((v) => v.shopId)
      );

      const pendingVisitsCount = Math.max(0, marketShops.length - visitedShopIds.size);
      const assignedMdo = marketers.find((mk) => mk.id === m.assignedMarketerId);

      return {
        marketId: m.id,
        marketName: m.name,
        district: m.district || 'General',
        assignedMdoName: assignedMdo?.name || m.assignedMarketerName || 'Unassigned',
        workingDays,
        totalVisits,
        totalNewParties,
        totalOrdersCount,
        totalSalesKg,
        totalSalesAmount,
        totalCollection,
        totalReturns,
        totalParties: marketShops.length,
        visitedPartiesCount: visitedShopIds.size,
        pendingVisitsCount,
        marketShops,
      };
    }).filter((m) => {
      if (selectedMarketId !== 'ALL' && m.marketId !== selectedMarketId) return false;
      return true;
    }).sort((a, b) => b.totalSalesAmount - a.totalSalesAmount);
  }, [markets, dailyMatrixData, shops, visits, fromDateIso, toDateIso, marketers, selectedMarketId]);

  // Party / Shop Development Portfolio Data
  const partyDevelopmentData = useMemo(() => {
    const newShopsInPeriod = shops.filter((s) => {
      const iso = parseDateToComparable(s.createdDate);
      if (!iso) return false;
      return iso >= fromDateIso && iso <= toDateIso;
    });

    const newShopsWithFirstOrder = newShopsInPeriod.map((s) => {
      const shopOrders = orders
        .filter((o) => isShopMatchingRecord(o, s))
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      const firstOrder = shopOrders[0] || null;
      const currentOutstanding = getShopOutstanding ? getShopOutstanding(s) : (s.outstanding || 0);
      const creatorMdo = marketers.find((m) => m.id === s.assignedMarketerId);

      return {
        ...s,
        creatorMdoName: creatorMdo?.name || s.createdByName || 'Field MDO',
        firstOrderDate: firstOrder?.date || 'No Order Yet',
        firstOrderKg: firstOrder?.totalKg || 0,
        firstOrderAmount: firstOrder?.grandTotal || firstOrder?.totalValue || 0,
        currentOutstanding,
      };
    });

    const visitedShopsSet = new Set(
      visits
        .filter((v) => {
          const iso = parseDateToComparable(v.date || v.createdDate);
          return iso >= fromDateIso && iso <= toDateIso;
        })
        .map((v) => v.shopId)
    );

    const orderedShopsSet = new Set(
      orders
        .filter((o) => {
          const iso = parseDateToComparable(o.date || o.createdDate);
          return iso >= fromDateIso && iso <= toDateIso;
        })
        .map((o) => o.shopId)
    );

    const activePartiesCount = new Set([...visitedShopsSet, ...orderedShopsSet]).size;
    const inactivePartiesCount = Math.max(0, shops.length - activePartiesCount);
    const partiesWithOrdersCount = orderedShopsSet.size;
    const partiesWithDuesCount = shops.filter((s) => {
      const due = getShopOutstanding ? getShopOutstanding(s) : (s.outstanding || 0);
      return due > 0;
    }).length;

    return {
      totalShopsCount: shops.length,
      activePartiesCount,
      inactivePartiesCount,
      newShopsCount: newShopsInPeriod.length,
      partiesWithOrdersCount,
      partiesWithDuesCount,
      newShopsList: newShopsWithFirstOrder,
    };
  }, [shops, orders, visits, fromDateIso, toDateIso, marketers, getShopOutstanding]);

  // Target vs Achievement Matrix
  const targetVsAchievementData = useMemo(() => {
    return activeMdos.map((mdo) => {
      const mdoTarget = targets.find((t) => t.marketerId === mdo.id) || {
        dailyKg: 130,
        dailyCollection: 25000,
        dailyVisits: 30,
        dailyNewCustomers: 3,
        monthlyKg: 2800,
        monthlyCollection: 540000,
        monthlyVisits: 650,
        monthlyNewCustomers: 60,
      };

      const mdoRows = dailyMatrixData.filter((r) => r.mdoId === mdo.id);
      const daysCount = periodDatesIso.length;

      const totalSalesKg = mdoRows.reduce((s, r) => s + r.totalSalesKg, 0);
      const totalSalesAmount = mdoRows.reduce((s, r) => s + r.totalSalesAmount, 0);
      const totalCollection = mdoRows.reduce((s, r) => s + r.totalCollectionAmount, 0);
      const totalVisits = mdoRows.reduce((s, r) => s + r.totalVisitsCount, 0);
      const totalNewParties = mdoRows.reduce((s, r) => s + r.totalNewPartiesCount, 0);

      const targetKg = (Number(mdoTarget.dailyKg) || 130) * daysCount;
      const targetColl = (Number(mdoTarget.dailyCollection) || 25000) * daysCount;
      const targetVisits = (Number(mdoTarget.dailyVisits) || 30) * daysCount;
      const targetNewParties = (Number(mdoTarget.dailyNewCustomers) || 3) * daysCount;

      const kgPct = targetKg > 0 ? ((totalSalesKg / targetKg) * 100).toFixed(1) : 'N/A';
      const collPct = targetColl > 0 ? ((totalCollection / targetColl) * 100).toFixed(1) : 'N/A';
      const visitPct = targetVisits > 0 ? ((totalVisits / targetVisits) * 100).toFixed(1) : 'N/A';
      const partyPct = targetNewParties > 0 ? ((totalNewParties / targetNewParties) * 100).toFixed(1) : 'N/A';

      return {
        mdoId: mdo.id,
        mdoName: mdo.name,
        targetKg,
        achievedKg: totalSalesKg,
        kgPct,
        remainingKg: Math.max(0, targetKg - totalSalesKg),
        targetColl,
        achievedColl: totalCollection,
        collPct,
        remainingColl: Math.max(0, targetColl - totalCollection),
        targetVisits,
        achievedVisits: totalVisits,
        visitPct,
        remainingVisits: Math.max(0, targetVisits - totalVisits),
        targetNewParties,
        achievedNewParties: totalNewParties,
        partyPct,
        rawTarget: mdoTarget,
      };
    });
  }, [activeMdos, dailyMatrixData, targets, periodDatesIso]);

  // Open Target Edit Modal
  const handleOpenEditTarget = (mdo) => {
    const t = targets.find((x) => x.marketerId === mdo.id);
    setEditingTargetMdo(mdo);
    setTargetFormData({
      dailyKg: t?.dailyKg ?? 130,
      dailyCollection: t?.dailyCollection ?? 25000,
      dailyVisits: t?.dailyVisits ?? 30,
      dailyNewCustomers: t?.dailyNewCustomers ?? 3,
      monthlyKg: t?.monthlyKg ?? 2800,
      monthlyCollection: t?.monthlyCollection ?? 540000,
      monthlyVisits: t?.monthlyVisits ?? 650,
      monthlyNewCustomers: t?.monthlyNewCustomers ?? 60,
    });
    setShowTargetModal(true);
  };

  // Save Target Modal
  const handleSaveTarget = (e) => {
    e.preventDefault();
    if (!editingTargetMdo) return;
    const existing = targets.find((t) => t.marketerId === editingTargetMdo.id);
    const payload = {
      marketerId: editingTargetMdo.id,
      marketerName: editingTargetMdo.name,
      targetType: 'Daily',
      dailyKg: Number(targetFormData.dailyKg) || 0,
      dailyCollection: Number(targetFormData.dailyCollection) || 0,
      dailyVisits: Number(targetFormData.dailyVisits) || 0,
      dailyNewCustomers: Number(targetFormData.dailyNewCustomers) || 0,
      monthlyKg: Number(targetFormData.monthlyKg) || 0,
      monthlyCollection: Number(targetFormData.monthlyCollection) || 0,
      monthlyVisits: Number(targetFormData.monthlyVisits) || 0,
      monthlyNewCustomers: Number(targetFormData.monthlyNewCustomers) || 0,
      active: true,
      updatedDate: todayStr,
    };

    if (existing) {
      updateTarget(existing.id, payload);
    } else {
      addTarget(payload);
    }
    setShowTargetModal(false);
  };

  // Multi-Sheet Professional Excel Export
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: MDO Summary
    const summaryRows = [
      ['PATEL SAHAB SPICES • MDO PERFORMANCE EXECUTIVE SUMMARY'],
      ['Report Period', rangeLabel],
      ['Generated On', `${todayStr} (Live App Export)`],
      ['Selected MDO', selectedMdoId === 'ALL' ? 'All MDOs' : marketers.find((m) => m.id === selectedMdoId)?.name],
      ['Selected Market', selectedMarketId === 'ALL' ? 'All Markets' : markets.find((m) => m.id === selectedMarketId)?.name],
      [],
      ['METRIC', 'VALUE'],
      ['Total Working Days', executiveSummary.totalWorkingDaysInPeriod],
      ['Days Present', executiveSummary.presentDaysCount],
      ['Days Absent / Off', executiveSummary.absentDaysCount],
      ['Markets Covered', executiveSummary.distinctMarketsCovered],
      ['Total Shop Visits', executiveSummary.totalShopVisits],
      ['New Parties Added', executiveSummary.totalNewParties],
      ['Total Orders Placed', executiveSummary.totalOrders],
      ['Total Sales Weight (KG)', executiveSummary.totalSalesKg],
      ['Total Sales Value (₹)', executiveSummary.totalSalesAmount],
      ['Total Collections (₹)', executiveSummary.totalCollection],
      ['Total Returns (₹)', executiveSummary.totalReturnsAmount],
      ['Total Returns (KG)', executiveSummary.totalReturnsKg],
      ['Sales KG Target Achievement %', executiveSummary.overallKgAchievementPct ? `${executiveSummary.overallKgAchievementPct}%` : 'N/A'],
      ['Collection Target Achievement %', executiveSummary.overallCollAchievementPct ? `${executiveSummary.overallCollAchievementPct}%` : 'N/A'],
      ['Visit Target Achievement %', executiveSummary.overallVisitAchievementPct ? `${executiveSummary.overallVisitAchievementPct}%` : 'N/A'],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'MDO Summary');

    // Sheet 2: Daily Report
    const dailyExportRows = [
      [
        'DATE',
        'DAY',
        'MDO NAME',
        'PLANNED MARKET',
        'ACTUAL MARKET',
        'ATTENDANCE',
        'START TIME',
        'END TIME',
        'WORKING HOURS',
        'SHOPS VISITED',
        'NEW PARTIES',
        'ORDERS',
        'SALES KG',
        'SALES AMOUNT (₹)',
        'COLLECTION (₹)',
        'RETURN AMOUNT (₹)',
        'RETURN KG',
        'KG TARGET (KG)',
        'KG ACHIEVE %',
      ],
      ...dailyMatrixData.map((r) => [
        r.displayDate,
        r.dayName,
        r.mdoName,
        r.planMarket,
        r.actualMarket,
        r.attendanceStatus,
        r.startTime,
        r.endTime,
        r.workingHours,
        r.totalVisitsCount,
        r.totalNewPartiesCount,
        r.totalOrdersCount,
        r.totalSalesKg,
        r.totalSalesAmount,
        r.totalCollectionAmount,
        r.totalReturnAmount,
        r.totalReturnKg,
        r.targetKg,
        r.kgAchievementPct ? `${r.kgAchievementPct}%` : '—',
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(dailyExportRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Daily Report');

    // Sheet 3: Market Report
    const marketExportRows = [
      [
        'MARKET NAME',
        'DISTRICT',
        'ASSIGNED MDO',
        'WORKING DAYS',
        'SHOP VISITS',
        'TOTAL PARTIES',
        'VISITED PARTIES',
        'PENDING PARTIES',
        'NEW PARTIES',
        'ORDERS',
        'SALES KG',
        'SALES AMOUNT (₹)',
        'COLLECTION (₹)',
        'RETURNS (₹)',
      ],
      ...marketWiseData.map((m) => [
        m.marketName,
        m.district,
        m.assignedMdoName,
        m.workingDays,
        m.totalVisits,
        m.totalParties,
        m.visitedPartiesCount,
        m.pendingVisitsCount,
        m.totalNewParties,
        m.totalOrdersCount,
        m.totalSalesKg,
        m.totalSalesAmount,
        m.totalCollection,
        m.totalReturns,
      ]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(marketExportRows);
    XLSX.utils.book_append_sheet(wb, ws3, 'Market Report');

    // Sheet 4: Shop / Party Activity Details in Period
    const allPeriodVisits = visits.filter((v) => {
      const iso = parseDateToComparable(v.date || v.createdDate);
      return iso >= fromDateIso && iso <= toDateIso;
    });

    const shopActivityRows = [
      [
        'DATE',
        'MDO NAME',
        'MARKET',
        'PARTY NAME',
        'VISIT STATUS',
        'VISIT TIME',
        'ORDER STATUS',
        'ORDER KG',
        'ORDER AMOUNT (₹)',
        'COLLECTION (₹)',
        'RETURN (₹)',
        'REMARKS',
      ],
      ...allPeriodVisits.map((v) => {
        const vIso = parseDateToComparable(v.date || v.createdDate);
        const relatedOrder = orders.find(
          (o) => o.shopId === v.shopId && parseDateToComparable(o.date || o.createdDate) === vIso
        );
        const relatedCol = collections.find(
          (c) => c.shopId === v.shopId && parseDateToComparable(c.date || c.createdDate) === vIso
        );
        const relatedRet = returns.find(
          (r) => r.shopId === v.shopId && parseDateToComparable(r.date || r.createdDate) === vIso
        );

        return [
          v.date || isoToDisplay(vIso),
          v.marketerName || 'MDO',
          v.marketName || '—',
          v.shopName || '—',
          v.isNewShop ? 'New Party Visit' : 'Regular Visit',
          v.time || '—',
          relatedOrder ? `Order Placed (#${relatedOrder.id || ''})` : 'No Order',
          relatedOrder ? relatedOrder.totalKg || 0 : 0,
          relatedOrder ? relatedOrder.grandTotal || relatedOrder.totalValue || 0 : 0,
          relatedCol ? relatedCol.amount || 0 : 0,
          relatedRet ? relatedRet.returnValue || 0 : 0,
          v.notes || v.outcomes?.join(', ') || '—',
        ];
      }),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(shopActivityRows);
    XLSX.utils.book_append_sheet(wb, ws4, 'Shop Activity');

    // Download File
    XLSX.writeFile(
      wb,
      `Patel_Sahab_MDO_30Days_Report_${fromDateIso}_to_${toDateIso}.xlsx`
    );
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-red-100 text-red-900 rounded-full text-[10px] font-black uppercase tracking-wider">
              Management Reporting System
            </span>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Live Database
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight mt-1">
            MDO 30-DAY PERFORMANCE SYSTEM
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Field Activity, Plan vs Actual Matrix, Orders, Collections & Target Achievement
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* TOP FILTER BAR */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-bold">
          {/* MDO Selector */}
          <div>
            <label className="text-slate-500 uppercase block mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-red-600" />
              <span>Select MDO / Marketer</span>
            </label>
            <select
              value={selectedMdoId}
              onChange={(e) => setSelectedMdoId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 font-extrabold"
            >
              <option value="ALL">All MDOs ({marketers.length} Officers)</option>
              {marketers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role || 'MDO'})
                </option>
              ))}
            </select>
          </div>

          {/* Market Selector */}
          <div>
            <label className="text-slate-500 uppercase block mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
              <span>Select Market</span>
            </label>
            <select
              value={selectedMarketId}
              onChange={(e) => setSelectedMarketId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 font-extrabold"
            >
              <option value="ALL">All Markets ({markets.length} Territories)</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.district || 'MP'})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Preset */}
          <div>
            <label className="text-slate-500 uppercase block mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Report Period</span>
            </label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 font-extrabold"
            >
              <option value="30_DAYS">Rolling Last 30 Days (Standard)</option>
              <option value="TODAY">Today Only</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="7_DAYS">Last 7 Days</option>
              <option value="THIS_MONTH">This Calendar Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="CUSTOM">Custom Date Range</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="text-slate-500 uppercase block mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-purple-600" />
              <span>Search Activity</span>
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Party, Market, Remark..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
        </div>

        {/* Custom Date Pickers (if custom selected) */}
        {datePreset === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs font-bold">
            <span className="text-slate-600 uppercase">Custom Dates:</span>
            <div className="flex items-center gap-2">
              <label className="text-slate-500">From:</label>
              <input
                type="date"
                value={customFromIso}
                onChange={(e) => setCustomFromIso(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-extrabold"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-500">To:</label>
              <input
                type="date"
                value={customToIso}
                onChange={(e) => setCustomToIso(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-extrabold"
              />
            </div>
          </div>
        )}

        {/* Active Period Display Banner */}
        <div className="flex flex-wrap justify-between items-center bg-slate-900 text-amber-300 px-4 py-2.5 rounded-2xl text-xs font-extrabold">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Active Range: {rangeLabel}</span>
            <span className="text-slate-400 text-[11px] font-medium">({periodDatesIso.length} Calendar Days)</span>
          </div>
          <div className="text-[11px] text-slate-300 font-semibold">
            Viewing: {selectedMdoId === 'ALL' ? 'All MDOs' : marketers.find((m) => m.id === selectedMdoId)?.name} • {selectedMarketId === 'ALL' ? 'All Markets' : markets.find((m) => m.id === selectedMarketId)?.name}
          </div>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        {/* Working Days & Attendance */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attendance</span>
          <p className="text-2xl font-black text-slate-900">
            {executiveSummary.presentDaysCount}
            <span className="text-xs text-slate-400 font-bold ml-1">/ {executiveSummary.totalWorkingDaysInPeriod} Days</span>
          </p>
          <p className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{Math.round((executiveSummary.presentDaysCount / (executiveSummary.totalWorkingDaysInPeriod || 1)) * 100)}% Present Rate</span>
          </p>
        </div>

        {/* Markets Covered */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Markets Covered</span>
          <p className="text-2xl font-black text-amber-900">
            {executiveSummary.distinctMarketsCovered}
            <span className="text-xs text-slate-400 font-bold ml-1">/ {markets.length}</span>
          </p>
          <p className="text-[10px] font-bold text-amber-700">Territories Visited</p>
        </div>

        {/* Total Shop Visits */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shop Visits</span>
          <p className="text-2xl font-black text-blue-900">{executiveSummary.totalShopVisits}</p>
          <p className="text-[10px] font-bold text-blue-700">
            Avg {Math.round(executiveSummary.totalShopVisits / (executiveSummary.presentDaysCount || 1))} visits/day
          </p>
        </div>

        {/* New Parties Added */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">New Parties</span>
          <p className="text-2xl font-black text-purple-900">{executiveSummary.totalNewParties}</p>
          <p className="text-[10px] font-bold text-purple-700">New Accounts Created</p>
        </div>

        {/* Total Sales Weight */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sales Weight</span>
          <p className="text-2xl font-black text-slate-900">{executiveSummary.totalSalesKg.toLocaleString('en-IN')} <span className="text-xs font-bold text-slate-500">KG</span></p>
          <p className="text-[10px] font-bold text-slate-600">
            {executiveSummary.totalOrders} Orders Taken
          </p>
        </div>

        {/* Total Sales Value */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sales Value</span>
          <p className="text-2xl font-black text-slate-900">₹{executiveSummary.totalSalesAmount.toLocaleString('en-IN')}</p>
          <p className="text-[10px] font-bold text-emerald-700">
            Target: {executiveSummary.overallKgAchievementPct ? `${executiveSummary.overallKgAchievementPct}%` : 'N/A'}
          </p>
        </div>

        {/* Total Collections */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Collections Received</span>
          <p className="text-2xl font-black text-emerald-700">₹{executiveSummary.totalCollection.toLocaleString('en-IN')}</p>
          <p className="text-[10px] font-bold text-emerald-800">
            Recovery: {executiveSummary.totalSalesAmount > 0 ? Math.round((executiveSummary.totalCollection / executiveSummary.totalSalesAmount) * 100) : 0}%
          </p>
        </div>

        {/* Returns Analysis */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stock Returns</span>
          <p className="text-2xl font-black text-red-600">₹{executiveSummary.totalReturnsAmount.toLocaleString('en-IN')}</p>
          <p className="text-[10px] font-bold text-red-700">{executiveSummary.totalReturnsKg} KG Returned</p>
        </div>

        {/* Overall Target % */}
        <div className="bg-gradient-to-br from-red-900 to-amber-900 text-white p-4 rounded-3xl shadow-sm col-span-2 sm:col-span-1 lg:col-span-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">30-Day Target Performance</span>
            <div className="flex flex-wrap gap-4 pt-1">
              <div>
                <span className="text-[10px] text-red-200 block">Sales Weight</span>
                <span className="text-lg font-black text-white">
                  {executiveSummary.overallKgAchievementPct != null ? `${executiveSummary.overallKgAchievementPct}%` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-red-200 block">Collections</span>
                <span className="text-lg font-black text-emerald-300">
                  {executiveSummary.overallCollAchievementPct != null ? `${executiveSummary.overallCollAchievementPct}%` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-red-200 block">Visits Coverage</span>
                <span className="text-lg font-black text-amber-300">
                  {executiveSummary.overallVisitAchievementPct != null ? `${executiveSummary.overallVisitAchievementPct}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => handleOpenEditTarget(activeMdos[0] || marketers[0])}
            className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-red-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Manage Targets</span>
          </button>
        </div>
      </div>

      {/* VIEW NAVIGATION TABS */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 text-xs font-black">
        <button
          onClick={() => setActiveTab('DAILY')}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 transition-all ${
            activeTab === 'DAILY'
              ? 'bg-slate-900 text-amber-300 shadow-md scale-102'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>1. Daily Performance Matrix ({dailyMatrixData.length} Days)</span>
        </button>

        <button
          onClick={() => setActiveTab('TARGET')}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 transition-all ${
            activeTab === 'TARGET'
              ? 'bg-slate-900 text-amber-300 shadow-md scale-102'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>2. Target vs Achievement</span>
        </button>

        <button
          onClick={() => setActiveTab('MARKET')}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 transition-all ${
            activeTab === 'MARKET'
              ? 'bg-slate-900 text-amber-300 shadow-md scale-102'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>3. Market-Wise Performance ({marketWiseData.length} Markets)</span>
        </button>

        <button
          onClick={() => setActiveTab('PARTIES')}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 transition-all ${
            activeTab === 'PARTIES'
              ? 'bg-slate-900 text-amber-300 shadow-md scale-102'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>4. Party Development ({partyDevelopmentData.newShopsCount} New)</span>
        </button>

        <button
          onClick={() => setActiveTab('CHARTS')}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 transition-all ${
            activeTab === 'CHARTS'
              ? 'bg-slate-900 text-amber-300 shadow-md scale-102'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>5. Performance Trends & Charts</span>
        </button>
      </div>

      {/* TAB 1: DAILY PERFORMANCE MATRIX */}
      {activeTab === 'DAILY' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-900 text-amber-300 flex flex-wrap justify-between items-center text-xs gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span className="font-black uppercase tracking-wider">
                MDO 30-DAY CHRONOLOGICAL DAILY MATRIX (ALL DATES INCLUDED)
              </span>
            </div>
            <span className="text-slate-300 font-bold text-[11px]">
              Click any row to inspect complete shop-wise activity breakdown 🔍
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-800 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3 border border-slate-700">Date & Day</th>
                  <th className="p-3 border border-slate-700">MDO Name</th>
                  <th className="p-3 border border-slate-700">Plan Market</th>
                  <th className="p-3 border border-slate-700">Actual Market</th>
                  <th className="p-3 border border-slate-700 text-center">Attendance Status</th>
                  <th className="p-3 border border-slate-700 text-center">Working Hours</th>
                  <th className="p-3 border border-slate-700 text-center">Visits</th>
                  <th className="p-3 border border-slate-700 text-center">New Parties</th>
                  <th className="p-3 border border-slate-700 text-center">Orders</th>
                  <th className="p-3 border border-slate-700 text-right">Sales KG</th>
                  <th className="p-3 border border-slate-700 text-right">Sales ₹</th>
                  <th className="p-3 border border-slate-700 text-right">Collection ₹</th>
                  <th className="p-3 border border-slate-700 text-right">Return ₹</th>
                  <th className="p-3 border border-slate-700 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {dailyMatrixData.length === 0 ? (
                  <tr>
                    <td colSpan="14" className="p-8 text-center text-slate-400 font-bold">
                      No activity found for the selected filter and period.
                    </td>
                  </tr>
                ) : (
                  dailyMatrixData.map((row, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setSelectedDayDetail(row)}
                      className={`cursor-pointer transition-colors ${
                        row.isPresent ? 'hover:bg-amber-50/50' : 'bg-slate-50/60 hover:bg-slate-100/80 text-slate-400'
                      }`}
                    >
                      <td className="p-3 border border-slate-200 font-black text-slate-900 whitespace-nowrap">
                        {row.displayDate}
                        <span className="block text-[10px] font-semibold text-slate-500">{row.dayName}</span>
                      </td>
                      <td className="p-3 border border-slate-200 font-extrabold text-slate-800 whitespace-nowrap">
                        {row.mdoName}
                      </td>
                      <td className="p-3 border border-slate-200 font-bold text-slate-700 uppercase whitespace-nowrap">
                        {row.planMarket}
                        {row.isOverride && (
                          <span className="block text-[9px] text-amber-700 font-bold">({row.planMarketNote})</span>
                        )}
                      </td>
                      <td className="p-3 border border-slate-200 font-extrabold text-amber-900 uppercase whitespace-nowrap">
                        {row.actualMarket}
                      </td>
                      <td className="p-3 border border-slate-200 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border inline-block ${row.attendanceBadge}`}>
                          {row.attendanceStatus}
                        </span>
                      </td>
                      <td className="p-3 border border-slate-200 text-center font-bold text-slate-700 whitespace-nowrap">
                        {row.workingHours}
                        {row.startTime !== '—' && (
                          <span className="block text-[9px] text-slate-400 font-medium">{row.startTime} - {row.endTime}</span>
                        )}
                      </td>
                      <td className="p-3 border border-slate-200 text-center font-black text-blue-900">
                        {row.totalVisitsCount}
                      </td>
                      <td className="p-3 border border-slate-200 text-center font-bold text-purple-700">
                        {row.totalNewPartiesCount > 0 ? `+${row.totalNewPartiesCount}` : '0'}
                      </td>
                      <td className="p-3 border border-slate-200 text-center font-bold text-slate-800">
                        {row.totalOrdersCount}
                      </td>
                      <td className="p-3 border border-slate-200 text-right font-black text-slate-900 whitespace-nowrap">
                        {row.totalSalesKg} KG
                        {row.kgAchievementPct != null && (
                          <span className={`block text-[9px] font-bold ${row.kgAchievementPct >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            ({row.kgAchievementPct}% Target)
                          </span>
                        )}
                      </td>
                      <td className="p-3 border border-slate-200 text-right font-black text-slate-900 whitespace-nowrap">
                        ₹{row.totalSalesAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 border border-slate-200 text-right font-black text-emerald-700 whitespace-nowrap">
                        ₹{row.totalCollectionAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 border border-slate-200 text-right font-bold text-red-600 whitespace-nowrap">
                        ₹{row.totalReturnAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 border border-slate-200 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDayDetail(row);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-amber-200 text-slate-800 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 mx-auto"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TARGET VS ACHIEVEMENT */}
      {activeTab === 'TARGET' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
            <div>
              <h3 className="font-black text-slate-900 text-lg uppercase flex items-center gap-2">
                <Target className="w-5 h-5 text-red-600" />
                <span>MDO Target vs Achievement Matrix ({rangeLabel})</span>
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                Daily and cumulative target comparisons with live achievement gap analysis
              </p>
            </div>
            <button
              onClick={() => handleOpenEditTarget(activeMdos[0] || marketers[0])}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Target Settings</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {targetVsAchievementData.map((item, idx) => (
              <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-black text-slate-900 text-base uppercase">{item.mdoName}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Period: {periodDatesIso.length} Working Days
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenEditTarget(marketers.find((m) => m.id === item.mdoId))}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
                    title="Edit Target"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                {/* 1. Sales KG Target Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700">Sales Weight (KG)</span>
                    <span className="text-slate-900 font-extrabold">
                      {item.achievedKg.toLocaleString('en-IN')} / {item.targetKg.toLocaleString('en-IN')} KG ({item.kgPct}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        Number(item.kgPct) >= 100 ? 'bg-emerald-500' : Number(item.kgPct) >= 70 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, Number(item.kgPct) || 0)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                    <span>Gap: {item.remainingKg > 0 ? `${item.remainingKg} KG Shortfall` : 'Target Achieved 🎉'}</span>
                    <span>Daily Target: {item.rawTarget?.dailyKg || 130} KG/day</span>
                  </div>
                </div>

                {/* 2. Collection Target Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700">Payment Collection (₹)</span>
                    <span className="text-emerald-700 font-extrabold">
                      ₹{item.achievedColl.toLocaleString('en-IN')} / ₹{item.targetColl.toLocaleString('en-IN')} ({item.collPct}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        Number(item.collPct) >= 100 ? 'bg-emerald-500' : Number(item.collPct) >= 70 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, Number(item.collPct) || 0)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                    <span>Gap: {item.remainingColl > 0 ? `₹${item.remainingColl.toLocaleString('en-IN')} Shortfall` : 'Target Achieved 🎉'}</span>
                    <span>Daily Target: ₹{(item.rawTarget?.dailyCollection || 25000).toLocaleString('en-IN')}/day</span>
                  </div>
                </div>

                {/* 3. Shop Visits Target */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700">Shop Visits Coverage</span>
                    <span className="text-blue-700 font-extrabold">
                      {item.achievedVisits} / {item.targetVisits} Visits ({item.visitPct}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        Number(item.visitPct) >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, Number(item.visitPct) || 0)}%` }}
                    />
                  </div>
                </div>

                {/* 4. New Parties Target */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700">New Party Development</span>
                    <span className="text-purple-700 font-extrabold">
                      {item.achievedNewParties} / {item.targetNewParties} Parties ({item.partyPct}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        Number(item.partyPct) >= 100 ? 'bg-emerald-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${Math.min(100, Number(item.partyPct) || 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MARKET-WISE PERFORMANCE */}
      {activeTab === 'MARKET' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-900 text-amber-300 flex justify-between items-center text-xs">
            <span className="font-black uppercase tracking-wider">MARKET TERRITORY PERFORMANCE BREAKDOWN</span>
            <span className="text-slate-300 font-bold">{marketWiseData.length} Markets Analyzed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-800 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3 border border-slate-700">Market Name</th>
                  <th className="p-3 border border-slate-700">District</th>
                  <th className="p-3 border border-slate-700">Assigned MDO</th>
                  <th className="p-3 border border-slate-700 text-center">Working Days</th>
                  <th className="p-3 border border-slate-700 text-center">Shop Visits</th>
                  <th className="p-3 border border-slate-700 text-center">Parties Coverage</th>
                  <th className="p-3 border border-slate-700 text-center">New Parties</th>
                  <th className="p-3 border border-slate-700 text-center">Orders</th>
                  <th className="p-3 border border-slate-700 text-right">Sales KG</th>
                  <th className="p-3 border border-slate-700 text-right">Sales Value (₹)</th>
                  <th className="p-3 border border-slate-700 text-right">Collection (₹)</th>
                  <th className="p-3 border border-slate-700 text-right">Returns (₹)</th>
                  <th className="p-3 border border-slate-700 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {marketWiseData.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 border border-slate-200 font-extrabold text-slate-900 uppercase">
                      {m.marketName}
                    </td>
                    <td className="p-3 border border-slate-200 text-slate-600 font-semibold">{m.district}</td>
                    <td className="p-3 border border-slate-200 text-slate-800 font-bold">{m.assignedMdoName}</td>
                    <td className="p-3 border border-slate-200 text-center font-black text-slate-900">{m.workingDays}</td>
                    <td className="p-3 border border-slate-200 text-center font-bold text-blue-800">{m.totalVisits}</td>
                    <td className="p-3 border border-slate-200 text-center font-bold text-slate-700">
                      {m.visitedPartiesCount} / {m.totalParties}
                      <span className="block text-[9px] text-slate-400">({m.pendingVisitsCount} Pending)</span>
                    </td>
                    <td className="p-3 border border-slate-200 text-center font-bold text-purple-700">
                      {m.totalNewParties > 0 ? `+${m.totalNewParties}` : '0'}
                    </td>
                    <td className="p-3 border border-slate-200 text-center font-bold text-slate-800">{m.totalOrdersCount}</td>
                    <td className="p-3 border border-slate-200 text-right font-black text-slate-900">{m.totalSalesKg} KG</td>
                    <td className="p-3 border border-slate-200 text-right font-black text-slate-900">₹{m.totalSalesAmount.toLocaleString('en-IN')}</td>
                    <td className="p-3 border border-slate-200 text-right font-black text-emerald-700">₹{m.totalCollection.toLocaleString('en-IN')}</td>
                    <td className="p-3 border border-slate-200 text-right font-bold text-red-600">₹{m.totalReturns.toLocaleString('en-IN')}</td>
                    <td className="p-3 border border-slate-200 text-center">
                      <button
                        onClick={() => setSelectedMarketDetail(m)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 text-slate-800 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 mx-auto"
                      >
                        <Store className="w-3 h-3 text-amber-700" />
                        <span>Shops</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PARTY / SHOP DEVELOPMENT REPORT */}
      {activeTab === 'PARTIES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Shop Portfolio</span>
              <p className="text-2xl font-black text-slate-900">{partyDevelopmentData.totalShopsCount}</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Active in Period</span>
              <p className="text-2xl font-black text-emerald-700">{partyDevelopmentData.activePartiesCount}</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">New Parties Created</span>
              <p className="text-2xl font-black text-purple-700">+{partyDevelopmentData.newShopsCount}</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Parties with Dues</span>
              <p className="text-2xl font-black text-red-600">{partyDevelopmentData.partiesWithDuesCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-900 text-amber-300 flex justify-between items-center text-xs">
              <span className="font-black uppercase tracking-wider">NEW PARTIES DEVELOPED IN SELECTED PERIOD</span>
              <span className="text-slate-300 font-bold">{partyDevelopmentData.newShopsList.length} New Customers</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-800 text-white uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3 border border-slate-700">Party Name</th>
                    <th className="p-3 border border-slate-700">Owner & Mobile</th>
                    <th className="p-3 border border-slate-700">Market / Route</th>
                    <th className="p-3 border border-slate-700">Created Date</th>
                    <th className="p-3 border border-slate-700">Created By (MDO)</th>
                    <th className="p-3 border border-slate-700">First Order Date</th>
                    <th className="p-3 border border-slate-700 text-right">First Order KG</th>
                    <th className="p-3 border border-slate-700 text-right">First Order ₹</th>
                    <th className="p-3 border border-slate-700 text-right">Current Outstanding</th>
                    <th className="p-3 border border-slate-700 text-center">Ledger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {partyDevelopmentData.newShopsList.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="p-8 text-center text-slate-400 font-bold">
                        No new parties were added during this selected period.
                      </td>
                    </tr>
                  ) : (
                    partyDevelopmentData.newShopsList.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 border border-slate-200 font-black text-slate-900">{s.name}</td>
                        <td className="p-3 border border-slate-200 text-slate-700">
                          {s.owner || '—'}
                          <span className="block text-[10px] text-slate-400">{s.mobile || ''}</span>
                        </td>
                        <td className="p-3 border border-slate-200 uppercase font-bold text-amber-900">
                          {s.connectedMarketName || s.marketName || 'Main Market'}
                        </td>
                        <td className="p-3 border border-slate-200 font-semibold text-slate-700">{s.createdDate || '—'}</td>
                        <td className="p-3 border border-slate-200 font-bold text-slate-800">{s.creatorMdoName}</td>
                        <td className="p-3 border border-slate-200 font-semibold text-slate-700">{s.firstOrderDate}</td>
                        <td className="p-3 border border-slate-200 text-right font-bold text-slate-900">{s.firstOrderKg} KG</td>
                        <td className="p-3 border border-slate-200 text-right font-black text-slate-900">₹{s.firstOrderAmount.toLocaleString('en-IN')}</td>
                        <td className="p-3 border border-slate-200 text-right font-black text-red-600">₹{s.currentOutstanding.toLocaleString('en-IN')}</td>
                        <td className="p-3 border border-slate-200 text-center">
                          <button
                            onClick={() => setHistoryShop(s)}
                            className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold rounded-lg text-[10px]"
                          >
                            Statement
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PERFORMANCE TRENDS & CHARTS */}
      {activeTab === 'CHARTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chart 1: Daily Sales KG Trend */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="font-black text-slate-900 text-sm uppercase flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-red-600" />
              <span>Daily Sales Weight Trend (KG)</span>
            </h4>
            <div className="h-48 flex items-end gap-1.5 pt-6 pb-2 px-2 overflow-x-auto border-b border-slate-100">
              {dailyMatrixData.slice(0, 15).reverse().map((r, i) => {
                const maxKg = Math.max(...dailyMatrixData.map((d) => d.totalSalesKg), 150);
                const heightPct = Math.max(8, Math.round((r.totalSalesKg / maxKg) * 100));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-[28px] group">
                    <span className="text-[9px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      {r.totalSalesKg}k
                    </span>
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        r.totalSalesKg > 0 ? 'bg-gradient-to-t from-red-800 to-amber-500' : 'bg-slate-200'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[8px] font-bold text-slate-400 truncate w-full text-center">
                      {r.displayDate.slice(0, 5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: Daily Collection Trend */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="font-black text-slate-900 text-sm uppercase flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
              <span>Daily Payment Collection Trend (₹)</span>
            </h4>
            <div className="h-48 flex items-end gap-1.5 pt-6 pb-2 px-2 overflow-x-auto border-b border-slate-100">
              {dailyMatrixData.slice(0, 15).reverse().map((r, i) => {
                const maxColl = Math.max(...dailyMatrixData.map((d) => d.totalCollectionAmount), 30000);
                const heightPct = Math.max(8, Math.round((r.totalCollectionAmount / maxColl) * 100));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-[28px] group">
                    <span className="text-[8px] font-bold text-emerald-800 opacity-0 group-hover:opacity-100 transition-opacity">
                      ₹{Math.round(r.totalCollectionAmount / 1000)}k
                    </span>
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        r.totalCollectionAmount > 0 ? 'bg-gradient-to-t from-emerald-800 to-teal-400' : 'bg-slate-200'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[8px] font-bold text-slate-400 truncate w-full text-center">
                      {r.displayDate.slice(0, 5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DAILY ACTIVITY DETAIL MODAL / DRAWER */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex justify-between items-start">
              <div>
                <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full uppercase">
                  Daily Field Activity Breakdown
                </span>
                <h3 className="text-xl font-black uppercase mt-1">
                  {selectedDayDetail.mdoName} • {selectedDayDetail.displayDate} ({selectedDayDetail.dayName})
                </h3>
                <p className="text-xs text-slate-300 font-semibold">
                  Planned Market: <span className="text-amber-300">{selectedDayDetail.planMarket}</span> • Actual Worked: <span className="text-emerald-300">{selectedDayDetail.actualMarket}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedDayDetail(null)}
                className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-slate-50 border-b border-slate-200 text-xs">
              <div className="bg-white p-3 rounded-2xl border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Attendance</span>
                <span className="font-black text-slate-900 text-sm">{selectedDayDetail.attendanceStatus}</span>
                <span className="block text-[10px] text-slate-500">{selectedDayDetail.startTime} - {selectedDayDetail.endTime}</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Visits & New</span>
                <span className="font-black text-blue-900 text-sm">{selectedDayDetail.totalVisitsCount} Visits</span>
                <span className="block text-[10px] text-purple-700">+{selectedDayDetail.totalNewPartiesCount} New Parties</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Sales Summary</span>
                <span className="font-black text-slate-900 text-sm">{selectedDayDetail.totalSalesKg} KG</span>
                <span className="block text-[10px] text-emerald-700">₹{selectedDayDetail.totalSalesAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Collection & Return</span>
                <span className="font-black text-emerald-700 text-sm">₹{selectedDayDetail.totalCollectionAmount.toLocaleString('en-IN')}</span>
                <span className="block text-[10px] text-red-600">Ret: ₹{selectedDayDetail.totalReturnAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Shop-by-Shop Breakdown List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                Shop-Wise Field Transactions on this Day ({selectedDayDetail.dayVisits.length} Visits recorded)
              </h4>

              {selectedDayDetail.dayVisits.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl">
                  No individual shop visits recorded on this date.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-2.5">Shop Name</th>
                        <th className="p-2.5">Market</th>
                        <th className="p-2.5">Time</th>
                        <th className="p-2.5">Visit Type</th>
                        <th className="p-2.5 text-right">Order Placed</th>
                        <th className="p-2.5 text-right">Collection (₹)</th>
                        <th className="p-2.5">Remarks / Outcomes</th>
                        <th className="p-2.5 text-center">Statement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {selectedDayDetail.dayVisits.map((v, i) => {
                        const targetShop = shops.find((s) => s.id === v.shopId) || { name: v.shopName, id: v.shopId };
                        const shopOrder = selectedDayDetail.dayOrders.find((o) => o.shopId === v.shopId);
                        const shopCol = selectedDayDetail.dayCollections.find((c) => c.shopId === v.shopId);

                        return (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-900">{v.shopName}</td>
                            <td className="p-2.5 uppercase text-slate-600">{v.marketName || selectedDayDetail.actualMarket}</td>
                            <td className="p-2.5 font-semibold text-slate-600">{v.time || '—'}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                v.isNewShop ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {v.isNewShop ? 'New Customer' : 'Regular'}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-black text-slate-900">
                              {shopOrder ? (
                                <span>{shopOrder.totalKg} KG (₹{(shopOrder.grandTotal || shopOrder.totalValue || 0).toLocaleString('en-IN')})</span>
                              ) : (
                                <span className="text-slate-400 font-normal">No Order</span>
                              )}
                            </td>
                            <td className="p-2.5 text-right font-black text-emerald-700">
                              {shopCol ? `₹${shopCol.amount.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="p-2.5 text-slate-600 text-[11px]">
                              {v.notes || v.outcomes?.join(', ') || '—'}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => setHistoryShop(targetShop)}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-amber-100 text-amber-900 rounded font-bold text-[10px]"
                              >
                                History
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedDayDetail(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-black"
              >
                Close Day Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MARKET DRILLDOWN MODAL */}
      {selectedMarketDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <span className="text-xs text-amber-300 font-bold uppercase">Market Territory Master</span>
                <h3 className="text-xl font-black uppercase">{selectedMarketDetail.marketName}</h3>
                <p className="text-xs text-slate-300">Assigned Officer: {selectedMarketDetail.assignedMdoName}</p>
              </div>
              <button
                onClick={() => setSelectedMarketDetail(null)}
                className="p-2 hover:bg-white/10 rounded-full text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2 text-xs">
              <h4 className="font-extrabold text-slate-800 uppercase">
                Registered Shops in Market ({selectedMarketDetail.marketShops.length})
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {selectedMarketDetail.marketShops.map((s) => {
                  const due = getShopOutstanding ? getShopOutstanding(s) : (s.outstanding || 0);
                  return (
                    <div key={s.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <p className="font-extrabold text-slate-900">{s.name}</p>
                        <p className="text-[11px] text-slate-500">{s.owner} • {s.mobile}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-black ${due > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          Due: ₹{due.toLocaleString('en-IN')}
                        </span>
                        <button
                          onClick={() => setHistoryShop(s)}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold text-[10px]"
                        >
                          Ledger
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedMarketDetail(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TARGET EDIT MODAL */}
      {showTargetModal && editingTargetMdo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTarget}
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden text-xs"
          >
            <div className="p-5 bg-gradient-to-r from-red-900 to-amber-900 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-300">Set Performance Standards</span>
                <h3 className="text-lg font-black uppercase">Edit Targets: {editingTargetMdo.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTargetModal(false)}
                className="p-1.5 hover:bg-white/10 rounded-full text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 font-bold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 uppercase block mb-1">Daily Sales KG Target</label>
                  <input
                    type="number"
                    value={targetFormData.dailyKg}
                    onChange={(e) => setTargetFormData({ ...targetFormData, dailyKg: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-black text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-600 uppercase block mb-1">Daily Collection Target (₹)</label>
                  <input
                    type="number"
                    value={targetFormData.dailyCollection}
                    onChange={(e) => setTargetFormData({ ...targetFormData, dailyCollection: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-black text-emerald-700"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-600 uppercase block mb-1">Daily Visits Target</label>
                  <input
                    type="number"
                    value={targetFormData.dailyVisits}
                    onChange={(e) => setTargetFormData({ ...targetFormData, dailyVisits: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-black text-blue-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-600 uppercase block mb-1">Daily New Parties Target</label>
                  <input
                    type="number"
                    value={targetFormData.dailyNewCustomers}
                    onChange={(e) => setTargetFormData({ ...targetFormData, dailyNewCustomers: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-black text-purple-900"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[11px] font-semibold">
                💡 Targets will automatically be synchronized with Daily Start My Day requirements and 30-Day performance benchmarks.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 font-black">
              <button
                type="button"
                onClick={() => setShowTargetModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl shadow-md"
              >
                Save Target Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SHOP HISTORY MODAL */}
      {historyShop && (
        <ShopHistoryModal shop={historyShop} onClose={() => setHistoryShop(null)} />
      )}
    </div>
  );
}
