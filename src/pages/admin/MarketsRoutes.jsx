import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  Calendar as CalendarIcon,
  Plus,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  Copy,
  Clock,
  Search,
  Filter,
  ArrowRight,
  Shield,
  Activity,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Sparkles,
  Layers,
  History,
  X,
  Check,
  RotateCcw,
  UserX,
  UserCheck,
  AlertCircle,
  FileSpreadsheet,
  Zap,
} from 'lucide-react';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const PREDEFINED_OVERRIDE_REASONS = [
  'Marketer Absent',
  'Market Requirement',
  'Special Order',
  'Collection Priority',
  'Staff Shortage',
  'Route Adjustment',
  'Emergency',
  'Other',
];

// Helper: Format Date string YYYY-MM-DD to DD-MM-YYYY
const toDisplayDate = (isoDate) => {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return isoDate;
};

// Helper: Convert DD-MM-YYYY to YYYY-MM-DD
const toIsoDate = (displayDate) => {
  if (!displayDate) return '';
  const parts = displayDate.split('-');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return displayDate;
};

// Helper: Get Day Name from DD-MM-YYYY or YYYY-MM-DD
const getDayNameFromDate = (dateStr) => {
  if (!dateStr) return '';
  let iso = dateStr;
  if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
    const parts = dateStr.split('-');
    iso = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'long' });
};

export default function MarketsRoutes() {
  const {
    markets = [],
    marketers = [],
    weeklyRoutes = [],
    tempAssignments = [],
    routeHistory = [],
    checkIns = [],
    addWeeklyRoute,
    updateWeeklyRoute,
    deleteWeeklyRoute,
    bulkUpdateWeeklyRoutes,
    addTempAssignment,
    updateTempAssignment,
    removeTempAssignment,
    addMarket,
    getFormattedDate,
    getFormattedTime,
    getTodayMarket,
  } = useData();

  const todayStr = getFormattedDate(); // DD-MM-YYYY

  // View Navigation: 'today' | 'matrix' | 'calendar' | 'schedule' | 'overrides' | 'history'
  const [activeTab, setActiveTab] = useState('today');

  // Filters State
  const [selectedMdoId, setSelectedMdoId] = useState('ALL');
  const [selectedMarketId, setSelectedMarketId] = useState('ALL');
  const [selectedDay, setSelectedDay] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'OVERRIDE' | 'ABSENT' | 'INACTIVE'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [editingWeeklyRoute, setEditingWeeklyRoute] = useState(null);
  const [customizeForm, setCustomizeForm] = useState({
    marketerId: '',
    days: ['Monday'],
    marketId: '',
    startTime: '09:45 AM',
    endTime: '06:30 PM',
    priority: 'Normal',
    notes: '',
    active: true,
  });

  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    date: todayStr,
    marketerId: '',
    marketId: '',
    reasonOption: 'Market Requirement',
    customReason: '',
    startTime: '09:45 AM',
    endTime: '06:30 PM',
    priority: 'Normal',
    notes: '',
  });

  const [showSubstituteModal, setShowSubstituteModal] = useState(false);
  const [substituteForm, setSubstituteForm] = useState({
    date: todayStr,
    absentMarketerId: '',
    substituteMarketerId: '',
    reasonOption: 'Marketer Absent',
    customReason: '',
    notes: '',
  });

  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyForm, setCopyForm] = useState({
    mode: 'DAY_TO_DAY', // 'DAY_TO_DAY' | 'MARKETER_TO_MARKETER'
    fromDay: 'Monday',
    toDay: 'Tuesday',
    fromMarketerId: '',
    toMarketerId: '',
  });

  // Inline Quick Add Market modal
  const [showAddMarketModal, setShowAddMarketModal] = useState(false);
  const [newMarketName, setNewMarketName] = useState('');
  const [newMarketDistrict, setNewMarketDistrict] = useState('Shajapur');

  // Conflict state
  const [conflictPrompt, setConflictPrompt] = useState(null); // { message, onConfirm, onReplace, onCancel }

  // Selected schedule rows for bulk actions
  const [selectedRouteIds, setSelectedRouteIds] = useState([]);

  // Calendar view navigation state
  const [calendarMode, setCalendarMode] = useState('MONTH'); // 'MONTH' | 'WEEK' | 'DAY'
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Quick helper to get marketer by ID
  const getMarketer = (id) => marketers.find((m) => m.id === id);
  const getMarket = (id) => markets.find((m) => m.id === id);

  // Active Overrides count for today
  const activeTodayOverrides = useMemo(() => {
    return tempAssignments.filter(
      (t) => (t.date === todayStr || t.assignmentDate === todayStr) && t.status !== 'Revoked' && t.status !== 'Cancelled'
    );
  }, [tempAssignments, todayStr]);

  // Absent Marketers count for today
  const absentMarketersToday = useMemo(() => {
    return tempAssignments.filter(
      (t) => (t.date === todayStr || t.assignmentDate === todayStr) && t.isAbsent && t.status !== 'Revoked'
    );
  }, [tempAssignments, todayStr]);

  // Route Conflicts detection for today
  const routeConflictsToday = useMemo(() => {
    const list = [];
    marketers.forEach((m) => {
      const overrides = tempAssignments.filter(
        (t) => (t.marketerId === m.id || t.assignedMarketerId === m.id) && (t.date === todayStr) && t.status !== 'Revoked'
      );
      if (overrides.length > 1) {
        list.push({ marketer: m, count: overrides.length, date: todayStr });
      }
    });
    return list;
  }, [marketers, tempAssignments, todayStr]);

  // Top Summary KPIs
  const summaryKpis = useMemo(() => {
    const totalMarketers = marketers.length;
    const routesToday = marketers.filter((m) => getTodayMarket(m.id, todayStr) != null).length;
    const activeOverrides = tempAssignments.filter((t) => t.status !== 'Revoked' && t.status !== 'Cancelled').length;
    const absentCount = absentMarketersToday.length;
    const unassignedCount = Math.max(0, totalMarketers - routesToday);
    const conflictsCount = routeConflictsToday.length;

    return {
      totalMarketers,
      routesToday,
      activeOverrides,
      absentCount,
      unassignedCount,
      conflictsCount,
    };
  }, [marketers, tempAssignments, absentMarketersToday, routeConflictsToday, todayStr, getTodayMarket]);

  // Today's Roster Computed List
  const todayRosterList = useMemo(() => {
    return marketers.map((m) => {
      const todayInfo = getTodayMarket(m.id, todayStr);
      const chk = checkIns.find(
        (c) => c.marketerId === m.id && (c.date === todayStr || c.createdDate === todayStr)
      );

      const isStarted = Boolean(chk);
      const isActive = Boolean(chk && chk.status === 'ACTIVE' && !chk.endTime && !chk.isDayEnded);
      const isEnded = Boolean(chk && (chk.status === 'INACTIVE' || chk.endTime || chk.isDayEnded));

      return {
        marketerId: m.id,
        marketerName: m.name,
        marketerMobile: m.mobile || '—',
        role: m.role || 'MDO',
        todayMarketName: todayInfo?.marketName || 'No Route Scheduled',
        todayMarketId: todayInfo?.marketId || null,
        routeType: todayInfo?.routeType || 'Unassigned',
        isOverride: Boolean(todayInfo?.isOverride),
        isSubstitute: Boolean(todayInfo?.isSubstitute),
        isAbsent: Boolean(todayInfo?.isAbsent),
        substituteMarketerName: todayInfo?.substituteMarketerName || null,
        absentMarketerName: todayInfo?.absentMarketerName || null,
        startTime: todayInfo?.startTime || '09:45 AM',
        endTime: todayInfo?.endTime || '06:30 PM',
        priority: todayInfo?.priority || 'Normal',
        reason: todayInfo?.reason || '',
        notes: todayInfo?.notes || '',
        isStarted,
        isActive,
        isEnded,
        checkInTime: chk?.startTime || chk?.createdTime || null,
        checkOutTime: isEnded ? chk.endTime : null,
      };
    }).filter((r) => {
      if (selectedMdoId !== 'ALL' && r.marketerId !== selectedMdoId) return false;
      if (selectedMarketId !== 'ALL' && r.todayMarketId !== selectedMarketId) return false;

      if (selectedStatus === 'ACTIVE' && !r.isActive) return false;
      if (selectedStatus === 'OVERRIDE' && !r.isOverride) return false;
      if (selectedStatus === 'ABSENT' && !r.isAbsent) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = r.marketerName.toLowerCase().includes(q);
        const matchMarket = r.todayMarketName.toLowerCase().includes(q);
        const matchReason = r.reason.toLowerCase().includes(q);
        if (!matchName && !matchMarket && !matchReason) return false;
      }
      return true;
    });
  }, [marketers, todayStr, checkIns, selectedMdoId, selectedMarketId, selectedStatus, searchQuery, getTodayMarket]);

  // Filtered Weekly Routes Table Data
  const filteredWeeklySchedule = useMemo(() => {
    return weeklyRoutes.map((r, idx) => {
      const mObj = getMarketer(r.marketerId);
      const mktObj = getMarket(r.marketId);

      return {
        id: r.id || `wr-${r.marketerId}-${r.day}-${idx}`,
        marketerId: r.marketerId,
        marketerName: r.marketerName || mObj?.name || 'Marketer',
        day: r.day || 'Monday',
        marketId: r.marketId,
        marketName: r.marketName || mktObj?.name || 'Assigned Market',
        startTime: r.startTime || '09:45 AM',
        endTime: r.endTime || '06:30 PM',
        priority: r.priority || 'Normal',
        notes: r.notes || '',
        active: r.active !== false && r.status !== 'Inactive',
        rawRoute: r,
      };
    }).filter((r) => {
      if (selectedMdoId !== 'ALL' && r.marketerId !== selectedMdoId) return false;
      if (selectedMarketId !== 'ALL' && r.marketId !== selectedMarketId) return false;
      if (selectedDay !== 'ALL' && r.day.toLowerCase() !== selectedDay.toLowerCase()) return false;
      if (selectedStatus === 'ACTIVE' && !r.active) return false;
      if (selectedStatus === 'INACTIVE' && r.active) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = r.marketerName.toLowerCase().includes(q);
        const matchMarket = r.marketName.toLowerCase().includes(q);
        const matchDay = r.day.toLowerCase().includes(q);
        const matchNotes = r.notes.toLowerCase().includes(q);
        if (!matchName && !matchMarket && !matchDay && !matchNotes) return false;
      }
      return true;
    }).sort((a, b) => {
      const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
      const diff = (dayOrder[a.day] || 9) - (dayOrder[b.day] || 9);
      if (diff !== 0) return diff;
      return a.marketerName.localeCompare(b.marketerName);
    });
  }, [weeklyRoutes, marketers, markets, selectedMdoId, selectedMarketId, selectedDay, selectedStatus, searchQuery]);

  // Handlers for + Customize Route Modal
  const handleOpenCustomize = (routeToEdit = null) => {
    if (routeToEdit) {
      setEditingWeeklyRoute(routeToEdit);
      setCustomizeForm({
        marketerId: routeToEdit.marketerId,
        days: [routeToEdit.day],
        marketId: routeToEdit.marketId,
        startTime: routeToEdit.startTime || '09:45 AM',
        endTime: routeToEdit.endTime || '06:30 PM',
        priority: routeToEdit.priority || 'Normal',
        notes: routeToEdit.notes || '',
        active: routeToEdit.active !== false,
      });
    } else {
      setEditingWeeklyRoute(null);
      setCustomizeForm({
        marketerId: marketers[0]?.id || '',
        days: ['Monday'],
        marketId: markets[0]?.id || '',
        startTime: '09:45 AM',
        endTime: '06:30 PM',
        priority: 'Normal',
        notes: '',
        active: true,
      });
    }
    setShowCustomizeModal(true);
  };

  const handleSaveCustomize = (e) => {
    e.preventDefault();
    if (!customizeForm.marketerId || !customizeForm.marketId || customizeForm.days.length === 0) {
      alert('Please select Marketer, Market, and at least one Day.');
      return;
    }

    const marketerObj = getMarketer(customizeForm.marketerId);
    const marketObj = getMarket(customizeForm.marketId);

    // Save for each selected day
    customizeForm.days.forEach((day) => {
      const payload = {
        marketerId: customizeForm.marketerId,
        marketerName: marketerObj?.name || '',
        day,
        marketId: customizeForm.marketId,
        marketName: marketObj?.name || '',
        startTime: customizeForm.startTime,
        endTime: customizeForm.endTime,
        priority: customizeForm.priority,
        notes: customizeForm.notes,
        active: customizeForm.active,
        status: customizeForm.active ? 'Active' : 'Inactive',
      };

      if (editingWeeklyRoute && editingWeeklyRoute.id) {
        updateWeeklyRoute(editingWeeklyRoute.id, payload);
      } else {
        addWeeklyRoute(payload);
      }
    });

    setShowCustomizeModal(false);
  };

  // Handlers for + Create Route Override Modal
  const handleOpenCreateOverride = (preselectedMarketerId = null, preselectedDate = null) => {
    const targetMarketerId = preselectedMarketerId || marketers[0]?.id || '';
    const targetDate = preselectedDate || todayStr;

    setOverrideForm({
      date: targetDate,
      marketerId: targetMarketerId,
      marketId: markets[0]?.id || '',
      reasonOption: 'Market Requirement',
      customReason: '',
      startTime: '09:45 AM',
      endTime: '06:30 PM',
      priority: 'Normal',
      notes: '',
    });
    setShowOverrideModal(true);
  };

  const handleSaveOverride = (e) => {
    e.preventDefault();
    if (!overrideForm.marketerId || !overrideForm.marketId || !overrideForm.date) {
      alert('Please fill all required override fields.');
      return;
    }

    const finalReason = overrideForm.reasonOption === 'Other'
      ? (overrideForm.customReason.trim() || 'Custom Override')
      : overrideForm.reasonOption;

    const marketerObj = getMarketer(overrideForm.marketerId);
    const marketObj = getMarket(overrideForm.marketId);

    // Find original route for this day
    const dayName = getDayNameFromDate(overrideForm.date);
    const originalRoute = weeklyRoutes.find(
      (r) => r.marketerId === overrideForm.marketerId && r.day?.toLowerCase() === dayName.toLowerCase()
    );

    // Check conflict: Is marketer already assigned another override on this date?
    const existingOverride = tempAssignments.find(
      (t) => (t.marketerId === overrideForm.marketerId) && (t.date === overrideForm.date) && t.status !== 'Revoked'
    );

    const executeSave = () => {
      addTempAssignment({
        marketerId: overrideForm.marketerId,
        marketerName: marketerObj?.name || '',
        marketId: overrideForm.marketId,
        marketName: marketObj?.name || '',
        originalMarketName: originalRoute?.marketName || 'Regular Schedule',
        date: overrideForm.date,
        reason: finalReason,
        startTime: overrideForm.startTime,
        endTime: overrideForm.endTime,
        priority: overrideForm.priority,
        notes: overrideForm.notes,
        isSubstitute: false,
        status: 'Active',
      });
      setShowOverrideModal(false);
    };

    if (existingOverride) {
      setConflictPrompt({
        message: `${marketerObj?.name || 'Marketer'} is already assigned to "${existingOverride.marketName}" on ${overrideForm.date}.`,
        onCancel: () => setConflictPrompt(null),
        onReplace: () => {
          removeTempAssignment(existingOverride.id, 'Replaced by New Override');
          executeSave();
          setConflictPrompt(null);
        },
        onConfirm: () => {
          executeSave();
          setConflictPrompt(null);
        },
      });
      return;
    }

    executeSave();
  };

  // Handlers for Marketer Absence & Substitute Modal
  const handleOpenSubstitute = () => {
    setSubstituteForm({
      date: todayStr,
      absentMarketerId: marketers[0]?.id || '',
      substituteMarketerId: marketers[1]?.id || marketers[0]?.id || '',
      reasonOption: 'Marketer Absent',
      customReason: '',
      notes: '',
    });
    setShowSubstituteModal(true);
  };

  const handleSaveSubstitute = (e) => {
    e.preventDefault();
    if (!substituteForm.absentMarketerId || !substituteForm.substituteMarketerId || !substituteForm.date) {
      alert('Please select both Absent and Substitute Marketer.');
      return;
    }
    if (substituteForm.absentMarketerId === substituteForm.substituteMarketerId) {
      alert('Absent marketer and substitute marketer cannot be the same person.');
      return;
    }

    const absentObj = getMarketer(substituteForm.absentMarketerId);
    const substituteObj = getMarketer(substituteForm.substituteMarketerId);

    const dayName = getDayNameFromDate(substituteForm.date);
    const absentOriginalRoute = weeklyRoutes.find(
      (r) => r.marketerId === substituteForm.absentMarketerId && r.day?.toLowerCase() === dayName.toLowerCase()
    );

    const coveredMarketId = absentOriginalRoute?.marketId || markets[0]?.id || 'mkt-pachore';
    const coveredMarketName = absentOriginalRoute?.marketName || 'Assigned Territory';

    const finalReason = substituteForm.reasonOption === 'Other'
      ? (substituteForm.customReason.trim() || 'Marketer Absent')
      : substituteForm.reasonOption;

    // 1. Mark Absent Record for original marketer
    addTempAssignment({
      marketerId: substituteForm.absentMarketerId,
      marketerName: absentObj?.name || '',
      marketId: coveredMarketId,
      marketName: coveredMarketName,
      date: substituteForm.date,
      reason: `${finalReason} - Covered by ${substituteObj?.name || 'Substitute'}`,
      isAbsent: true,
      substituteMarketerId: substituteForm.substituteMarketerId,
      substituteMarketerName: substituteObj?.name || '',
      status: 'Active',
    });

    // 2. Assign Substitute Record
    addTempAssignment({
      marketerId: substituteForm.substituteMarketerId,
      marketerName: substituteObj?.name || '',
      marketId: coveredMarketId,
      marketName: coveredMarketName,
      date: substituteForm.date,
      reason: `Substitute Coverage for ${absentObj?.name || 'Absent Officer'} (${finalReason})`,
      isSubstitute: true,
      absentMarketerId: substituteForm.absentMarketerId,
      absentMarketerName: absentObj?.name || '',
      status: 'Active',
    });

    setShowSubstituteModal(false);
  };

  // Handlers for Copy Route Modal
  const handleOpenCopy = () => {
    setCopyForm({
      mode: 'DAY_TO_DAY',
      fromDay: 'Monday',
      toDay: 'Tuesday',
      fromMarketerId: marketers[0]?.id || '',
      toMarketerId: marketers[1]?.id || marketers[0]?.id || '',
    });
    setShowCopyModal(true);
  };

  const handleExecuteCopy = (e) => {
    e.preventDefault();

    if (copyForm.mode === 'DAY_TO_DAY') {
      const sourceRoutes = weeklyRoutes.filter((r) => r.day?.toLowerCase() === copyForm.fromDay.toLowerCase());
      if (sourceRoutes.length === 0) {
        alert(`No routes found on ${copyForm.fromDay} to copy.`);
        return;
      }

      if (!window.confirm(`Copy all ${sourceRoutes.length} route assignments from ${copyForm.fromDay} to ${copyForm.toDay}? Existing assignments on ${copyForm.toDay} will be replaced.`)) {
        return;
      }

      // Remove existing routes for toDay and add duplicated ones
      const cleaned = weeklyRoutes.filter((r) => r.day?.toLowerCase() !== copyForm.toDay.toLowerCase());
      const newItems = sourceRoutes.map((r) => ({
        ...r,
        id: `wr-${r.marketerId}-${copyForm.toDay}-${Date.now()}`,
        day: copyForm.toDay,
        updatedDate: getFormattedDate(),
      }));

      bulkUpdateWeeklyRoutes([...cleaned, ...newItems], `Copied Schedule from ${copyForm.fromDay} to ${copyForm.toDay}`);
      setShowCopyModal(false);
    } else if (copyForm.mode === 'MARKETER_TO_MARKETER') {
      if (copyForm.fromMarketerId === copyForm.toMarketerId) {
        alert('Source and target marketers cannot be the same.');
        return;
      }

      const sourceRoutes = weeklyRoutes.filter((r) => r.marketerId === copyForm.fromMarketerId);
      const fromObj = getMarketer(copyForm.fromMarketerId);
      const toObj = getMarketer(copyForm.toMarketerId);

      if (sourceRoutes.length === 0) {
        alert(`No weekly routes found for ${fromObj?.name || 'Source Marketer'}.`);
        return;
      }

      if (!window.confirm(`Copy entire weekly route schedule from ${fromObj?.name} to ${toObj?.name}?`)) {
        return;
      }

      const cleaned = weeklyRoutes.filter((r) => r.marketerId !== copyForm.toMarketerId);
      const newItems = sourceRoutes.map((r) => ({
        ...r,
        id: `wr-${copyForm.toMarketerId}-${r.day}-${Date.now()}`,
        marketerId: copyForm.toMarketerId,
        marketerName: toObj?.name || '',
        updatedDate: getFormattedDate(),
      }));

      bulkUpdateWeeklyRoutes([...cleaned, ...newItems], `Copied Schedule from ${fromObj?.name} to ${toObj?.name}`);
      setShowCopyModal(false);
    }
  };

  // Inline Quick Add Market
  const handleSaveQuickMarket = (e) => {
    e.preventDefault();
    if (!newMarketName.trim()) return;
    const mkt = addMarket({
      name: newMarketName.trim(),
      district: newMarketDistrict.trim(),
    });
    setCustomizeForm((f) => ({ ...f, marketId: mkt.id }));
    setOverrideForm((f) => ({ ...f, marketId: mkt.id }));
    setNewMarketName('');
    setShowAddMarketModal(false);
  };

  // Bulk Actions on Schedule Table
  const handleBulkActivate = () => {
    if (selectedRouteIds.length === 0) return;
    const updated = weeklyRoutes.map((r) =>
      selectedRouteIds.includes(r.id) ? { ...r, active: true, status: 'Active' } : r
    );
    bulkUpdateWeeklyRoutes(updated, `Bulk activated ${selectedRouteIds.length} routes`);
    setSelectedRouteIds([]);
  };

  const handleBulkDeactivate = () => {
    if (selectedRouteIds.length === 0) return;
    const updated = weeklyRoutes.map((r) =>
      selectedRouteIds.includes(r.id) ? { ...r, active: false, status: 'Inactive' } : r
    );
    bulkUpdateWeeklyRoutes(updated, `Bulk deactivated ${selectedRouteIds.length} routes`);
    setSelectedRouteIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedRouteIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedRouteIds.length} selected weekly routes?`)) return;
    const updated = weeklyRoutes.filter((r) => !selectedRouteIds.includes(r.id));
    bulkUpdateWeeklyRoutes(updated, `Bulk deleted ${selectedRouteIds.length} routes`);
    setSelectedRouteIds([]);
  };

  // Calendar Day cell generator for Month View
  const calendarMonthDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    const pad = (n) => String(n).padStart(2, '0');

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        dayNumber: prevMonthDays - i,
        isCurrentMonth: false,
        dateStr: `${pad(prevMonthDays - i)}-${pad(month === 0 ? 12 : month)}-${month === 0 ? year - 1 : year}`,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        dayNumber: i,
        isCurrentMonth: true,
        dateStr: `${pad(i)}-${pad(month + 1)}-${year}`,
      });
    }

    // Next month padding to fill grid to 35 or 42
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        dayNumber: i,
        isCurrentMonth: false,
        dateStr: `${pad(i)}-${pad(month === 11 ? 1 : month + 2)}-${month === 11 ? year + 1 : year}`,
      });
    }

    return days;
  }, [calendarDate]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-red-100 text-red-900 rounded-full text-[10px] font-black uppercase tracking-wider">
              Patel Sahab Spices
            </span>
            <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-700" />
              Route Management & Scheduling Engine
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight mt-1">
            WEEKLY ROUTES & OVERRIDES
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Manage permanent weekly recurring itineraries, single-day temporary overrides, and substitute coverage
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => handleOpenCustomize()}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Customize Route</span>
          </button>
          <button
            onClick={() => handleOpenCreateOverride()}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>+ Create Override</span>
          </button>
          <button
            onClick={handleOpenSubstitute}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition-all"
            title="Mark Absence & Assign Substitute"
          >
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Substitute</span>
          </button>
          <button
            onClick={handleOpenCopy}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
            title="Copy Schedule"
          >
            <Copy className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">Copy Route</span>
          </button>
        </div>
      </div>

      {/* TOP SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        {/* Total Marketers */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total MDOs</span>
          <p className="text-2xl font-black text-slate-900">{summaryKpis.totalMarketers}</p>
          <p className="text-[10px] font-bold text-slate-500">Registered Field Force</p>
        </div>

        {/* Routes Today */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Routes Today</span>
          <p className="text-2xl font-black text-emerald-700">{summaryKpis.routesToday}</p>
          <p className="text-[10px] font-bold text-emerald-700">Scheduled for Today</p>
        </div>

        {/* Active Overrides */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Overrides</span>
          <p className="text-2xl font-black text-amber-900">{summaryKpis.activeOverrides}</p>
          <p className="text-[10px] font-bold text-amber-700">Temporary Day Routes</p>
        </div>

        {/* Absent Marketers */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Absent Today</span>
          <p className={`text-2xl font-black ${summaryKpis.absentCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {summaryKpis.absentCount}
          </p>
          <p className="text-[10px] font-bold text-rose-700">Marked On Leave</p>
        </div>

        {/* Unassigned */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unassigned</span>
          <p className={`text-2xl font-black ${summaryKpis.unassignedCount > 0 ? 'text-amber-800' : 'text-slate-400'}`}>
            {summaryKpis.unassignedCount}
          </p>
          <p className="text-[10px] font-bold text-slate-500">Off / Missing Route</p>
        </div>

        {/* Route Conflicts */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Route Conflicts</span>
          <p className={`text-2xl font-black ${summaryKpis.conflictsCount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {summaryKpis.conflictsCount}
          </p>
          <p className="text-[10px] font-bold text-slate-500">
            {summaryKpis.conflictsCount === 0 ? '0 Conflicts' : 'Double Bookings'}
          </p>
        </div>
      </div>

      {/* VIEW TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
        {[
          { id: 'today', label: `Today's Roster (${todayRosterList.length})`, icon: CalendarIcon },
          { id: 'matrix', label: 'This Week Matrix', icon: Layers },
          { id: 'calendar', label: 'Calendar View', icon: CalendarDays },
          { id: 'schedule', label: `Weekly Schedule Table (${filteredWeeklySchedule.length})`, icon: FileSpreadsheet },
          { id: 'overrides', label: `Overrides & Substitutes (${tempAssignments.length})`, icon: Zap },
          { id: 'history', label: `Route History (${routeHistory.length})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-4 text-xs font-black uppercase transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-red-700 text-red-900 bg-red-50/40 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-red-700' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-bold">
          {/* MDO Selector */}
          <div>
            <label className="text-slate-500 uppercase block mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-red-600" />
              <span>Filter MDO</span>
            </label>
            <select
              value={selectedMdoId}
              onChange={(e) => setSelectedMdoId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 font-extrabold"
            >
              <option value="ALL">All Marketers ({marketers.length})</option>
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
              <span>Filter Market</span>
            </label>
            <select
              value={selectedMarketId}
              onChange={(e) => setSelectedMarketId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 font-extrabold"
            >
              <option value="ALL">All Markets ({markets.length})</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.district || 'MP'})
                </option>
              ))}
            </select>
          </div>

          {/* Day of Week */}
          <div>
            <label className="text-slate-500 uppercase block mb-1 flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Day of Week</span>
            </label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 font-extrabold"
            >
              <option value="ALL">All Weekdays (Mon-Sun)</option>
              {DAYS_OF_WEEK.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-slate-500 uppercase block mb-1 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-purple-600" />
              <span>Route Status</span>
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 font-extrabold"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">🟢 Active Routes</option>
              <option value="OVERRIDE">⚡ Temporary Overrides</option>
              <option value="ABSENT">🚫 Marked Absent</option>
              <option value="INACTIVE">⚪ Inactive</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="text-slate-500 uppercase block mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Search Schedule</span>
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Marketer, Market, Notes..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TODAY'S ACTIVE ROSTER                                              */}
      {/* ========================================================================= */}
      {activeTab === 'today' && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-amber-300 p-4 rounded-3xl flex flex-wrap justify-between items-center text-xs font-extrabold gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Today's Scheduling Equation:</span>
              <span className="bg-amber-400/20 text-amber-200 px-2.5 py-0.5 rounded-lg border border-amber-400/30">
                Today's Final Route = Recurring Weekly Route + Active Temporary Override
              </span>
            </div>
            <div className="text-slate-300">Date: {todayStr} ({getDayNameFromDate(todayStr)})</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayRosterList.map((r) => (
              <div
                key={r.marketerId}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 hover:border-slate-300 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-slate-900 text-base">{r.marketerName}</h3>
                    <p className="text-xs text-slate-500 font-medium">{r.role} • {r.marketerMobile}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 ${
                      r.isActive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : r.isEnded
                        ? 'bg-slate-100 text-slate-600 border-slate-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        r.isActive ? 'bg-emerald-500 animate-pulse' : r.isEnded ? 'bg-slate-400' : 'bg-amber-500'
                      }`}
                    />
                    <span>{r.isActive ? 'DAY ACTIVE' : r.isEnded ? 'DAY ENDED' : 'NOT STARTED'}</span>
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">Today's Market:</span>
                    <span className="font-black text-slate-900 text-sm uppercase">{r.todayMarketName}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">Route Assignment:</span>
                    <span
                      className={`font-black text-[11px] px-2 py-0.5 rounded-md ${
                        r.isOverride
                          ? 'bg-amber-100 text-amber-900'
                          : r.isSubstitute
                          ? 'bg-blue-100 text-blue-900'
                          : r.isAbsent
                          ? 'bg-rose-100 text-rose-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {r.routeType}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">Timing / Shift:</span>
                    <span className="font-extrabold text-slate-800">{r.startTime} – {r.endTime}</span>
                  </div>

                  {r.reason && (
                    <div className="pt-1.5 border-t border-slate-200 text-[11px] text-amber-800 font-semibold italic">
                      "{r.reason}"
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenCreateOverride(r.marketerId, todayStr)}
                    className="flex-1 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl font-bold text-xs border border-amber-200 flex items-center justify-center gap-1 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-700" />
                    <span>Create Override</span>
                  </button>
                  <button
                    onClick={() => {
                      const weekly = weeklyRoutes.find(
                        (w) => w.marketerId === r.marketerId && w.day?.toLowerCase() === getDayNameFromDate(todayStr).toLowerCase()
                      );
                      handleOpenCustomize(weekly || { marketerId: r.marketerId, day: getDayNameFromDate(todayStr) });
                    }}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                    title="Customize Recurring Route"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: THIS WEEK MATRIX GRID (MON - SUN)                                   */}
      {/* ========================================================================= */}
      {activeTab === 'matrix' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
              <Layers className="w-5 h-5 text-red-700" />
              <span>WEEKLY RECURRING ROUTE SCHEDULE MATRIX</span>
            </h2>
            <span className="text-xs font-bold text-slate-500">
              Click any cell to edit recurring route
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-amber-300 uppercase text-[10px] font-bold">
                  <th className="p-3.5 border border-slate-800">MDO Officer</th>
                  {DAYS_OF_WEEK.map((day) => (
                    <th key={day} className="p-3.5 border border-slate-800 text-center">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {marketers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="p-3.5 border border-slate-200 font-extrabold text-slate-900 bg-slate-50/70">
                      <div>{m.name}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{m.role || 'MDO'}</div>
                    </td>

                    {DAYS_OF_WEEK.map((day) => {
                      const route = weeklyRoutes.find(
                        (r) => r.marketerId === m.id && r.day?.toLowerCase() === day.toLowerCase()
                      );

                      return (
                        <td
                          key={day}
                          onClick={() => handleOpenCustomize(route || { marketerId: m.id, day })}
                          className="p-2.5 border border-slate-200 text-center cursor-pointer hover:bg-amber-50/50 transition-colors"
                        >
                          {route ? (
                            <div
                              className={`p-2 rounded-xl text-xs font-black shadow-2xs border ${
                                route.active !== false
                                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                                  : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                              }`}
                            >
                              <span className="block truncate">{route.marketName}</span>
                              <span className="text-[9px] text-slate-500 font-semibold block mt-0.5">
                                {route.startTime || '9:45 AM'} - {route.endTime || '6:30 PM'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs italic font-bold hover:text-slate-500">
                              + Set Route
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DATE-WISE INTERACTIVE CALENDAR VIEW                                */}
      {/* ========================================================================= */}
      {activeTab === 'calendar' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          {/* Calendar Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-red-700" />
              <h2 className="text-base font-black text-slate-900 uppercase">
                {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const d = new Date(calendarDate);
                  d.setMonth(d.getMonth() - 1);
                  setCalendarDate(d);
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCalendarDate(new Date())}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const d = new Date(calendarDate);
                  d.setMonth(d.getMonth() + 1);
                  setCalendarDate(d);
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Month Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="p-2 text-center text-xs font-black uppercase text-slate-400 bg-slate-50 rounded-xl">
                {d.slice(0, 3)}
              </div>
            ))}

            {calendarMonthDays.map((cell, idx) => {
              const dayName = getDayNameFromDate(cell.dateStr);
              const isToday = cell.dateStr === todayStr;

              // Overrides for this cell date
              const dayOverrides = tempAssignments.filter(
                (t) => (t.date === cell.dateStr || t.assignmentDate === cell.dateStr) && t.status !== 'Revoked'
              );

              return (
                <div
                  key={idx}
                  onClick={() => handleOpenCreateOverride(null, cell.dateStr)}
                  className={`min-h-[90px] p-2 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                    isToday
                      ? 'bg-red-50/60 border-red-300 shadow-xs ring-2 ring-red-400'
                      : cell.isCurrentMonth
                      ? 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-2xs'
                      : 'bg-slate-50/50 border-slate-100 opacity-60'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-xs font-black ${
                        isToday ? 'text-red-700 font-black' : cell.isCurrentMonth ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {dayOverrides.length > 0 && (
                      <span className="px-1.5 py-0.2 bg-amber-400 text-amber-950 text-[9px] font-black rounded-md">
                        {dayOverrides.length} Override
                      </span>
                    )}
                  </div>

                  {/* Marketer summary chips */}
                  <div className="space-y-1">
                    {marketers.slice(0, 2).map((m) => {
                      const override = dayOverrides.find((t) => t.marketerId === m.id);
                      const regular = weeklyRoutes.find(
                        (r) => r.marketerId === m.id && r.day?.toLowerCase() === dayName.toLowerCase()
                      );
                      const mktName = override ? override.marketName : regular ? regular.marketName : null;

                      if (!mktName) return null;

                      return (
                        <div
                          key={m.id}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold truncate ${
                            override
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                          title={`${m.name} → ${mktName} (${override ? 'Override' : 'Regular'})`}
                        >
                          <span className="font-extrabold">{m.name.split(' ')[0]}:</span> {mktName}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FULL WEEKLY SCHEDULE TABLE                                         */}
      {/* ========================================================================= */}
      {activeTab === 'schedule' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h2 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-red-600" />
              <span>Weekly Schedule Master Roster</span>
            </h2>

            {/* Bulk Action Controls */}
            {selectedRouteIds.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-2xl text-xs">
                <span className="font-bold text-amber-300">{selectedRouteIds.length} Selected</span>
                <button
                  onClick={handleBulkActivate}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold text-[11px]"
                >
                  Activate
                </button>
                <button
                  onClick={handleBulkDeactivate}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 rounded-lg font-bold text-[11px]"
                >
                  Deactivate
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-[11px]"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black border-b border-slate-200">
                <tr>
                  <th className="p-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedRouteIds.length === filteredWeeklySchedule.length && filteredWeeklySchedule.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRouteIds(filteredWeeklySchedule.map((r) => r.id));
                        } else {
                          setSelectedRouteIds([]);
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="p-3">Day</th>
                  <th className="p-3">Marketer</th>
                  <th className="p-3">Assigned Market</th>
                  <th className="p-3">Start Time</th>
                  <th className="p-3">End Time</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredWeeklySchedule.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-slate-400 font-bold">
                      No routes found. Click <strong>+ Customize Route</strong> to add one.
                    </td>
                  </tr>
                ) : (
                  filteredWeeklySchedule.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedRouteIds.includes(r.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRouteIds((prev) => [...prev, r.id]);
                            } else {
                              setSelectedRouteIds((prev) => prev.filter((id) => id !== r.id));
                            }
                          }}
                          className="rounded"
                        />
                      </td>
                      <td className="p-3 font-extrabold text-slate-900">{r.day}</td>
                      <td className="p-3 font-bold text-slate-800">{r.marketerName}</td>
                      <td className="p-3 font-black text-amber-950 uppercase">{r.marketName}</td>
                      <td className="p-3 font-semibold text-slate-600">{r.startTime}</td>
                      <td className="p-3 font-semibold text-slate-600">{r.endTime}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            r.priority === 'High Priority'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {r.priority}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            r.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {r.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenCustomize(r)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                            title="Edit Route"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              addWeeklyRoute({
                                ...r.rawRoute,
                                id: `wr-${r.marketerId}-${r.day}-${Date.now()}`,
                                notes: `${r.notes || ''} (Copy)`,
                              });
                            }}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
                            title="Duplicate Schedule"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete ${r.day} route for ${r.marketerName}?`)) {
                                deleteWeeklyRoute(r.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete Schedule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: OVERRIDES & SUBSTITUTES LIST                                       */}
      {/* ========================================================================= */}
      {activeTab === 'overrides' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-600" />
                <span>ACTIVE & PAST SINGLE-DAY ROUTE OVERRIDES</span>
              </h2>
              <p className="text-xs text-slate-500">
                Single-day temporary adjustments that automatically revert after their target date.
              </p>
            </div>
            <button
              onClick={() => handleOpenCreateOverride()}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Override</span>
            </button>
          </div>

          <div className="space-y-3">
            {tempAssignments.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-bold text-xs">
                No active route overrides.
              </div>
            ) : (
              tempAssignments.map((t) => {
                const marketerObj = getMarketer(t.marketerId);
                return (
                  <div
                    key={t.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{marketerObj?.name || t.marketerName}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-black text-amber-900 uppercase text-sm">{t.marketName}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            t.isAbsent
                              ? 'bg-rose-100 text-rose-800'
                              : t.isSubstitute
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.isAbsent ? 'Absent' : t.isSubstitute ? 'Substitute' : 'Single-Day Override'}
                        </span>
                      </div>
                      <div className="text-slate-500 font-medium">
                        Target Date: <strong>{t.date || t.assignmentDate}</strong> ({getDayNameFromDate(t.date)}) • Time: {t.startTime || '9:45 AM'} - {t.endTime || '6:30 PM'}
                      </div>
                      <div className="text-amber-800 font-semibold italic text-[11px]">
                        Reason: "{t.reason || 'Admin Override'}"
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (window.confirm('Revoke this temporary override and revert to the regular weekly route?')) {
                          removeTempAssignment(t.id, 'Manually Revoked by Admin');
                        }
                      }}
                      className="px-3 py-1.5 bg-white border border-red-200 text-red-700 hover:bg-red-50 rounded-xl font-bold text-xs flex items-center gap-1 shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke Override</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: IMMUTABLE ROUTE HISTORY / AUDIT LOG                                */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                <span>PERMANENT ROUTE AUDIT & CHANGE LOG</span>
              </h2>
              <p className="text-xs text-slate-500">
                Complete historical record of all schedule modifications, overrides, and substitutions.
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {routeHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-bold text-xs">
                No route change logs recorded yet.
              </div>
            ) : (
              routeHistory.map((h, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex justify-between items-start gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{h.marketerName || 'MDO'}</span>
                      <span className="text-slate-400">•</span>
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 text-[10px] font-black uppercase">
                        {h.changeType}
                      </span>
                    </div>
                    <div className="text-slate-700 font-medium">
                      {h.oldMarketName && h.oldMarketName !== '—' && (
                        <span>
                          <span className="line-through text-slate-400">{h.oldMarketName}</span> →{' '}
                        </span>
                      )}
                      <strong className="text-slate-900">{h.newMarketName}</strong>
                      {h.effectiveDate && <span className="text-slate-500 font-semibold"> (Effective: {h.effectiveDate})</span>}
                    </div>
                    <p className="text-[11px] text-slate-500 italic">"{h.reason}"</p>
                  </div>
                  <div className="text-right text-[10px] text-slate-400 font-semibold shrink-0">
                    <div>{h.displayDate || toDisplayDate(h.timestamp?.slice(0, 10))}</div>
                    <div>{h.displayTime || h.timestamp?.slice(11, 16)}</div>
                    <div className="text-slate-500 font-bold">{h.changedBy || 'Admin'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CUSTOMIZE RECURRING ROUTE                                        */}
      {/* ========================================================================= */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {editingWeeklyRoute ? 'EDIT RECURRING WEEKLY ROUTE' : 'CUSTOMIZE RECURRING WEEKLY ROUTE'}
                </h2>
                <p className="text-xs text-slate-500">
                  Configure recurring day itineraries for field marketers.
                </p>
              </div>
              <button onClick={() => setShowCustomizeModal(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomize} className="space-y-4 text-xs">
              {/* Marketer Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">1. Select Marketer *</label>
                <select
                  value={customizeForm.marketerId}
                  onChange={(e) => setCustomizeForm((f) => ({ ...f, marketerId: e.target.value }))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-red-600 outline-none"
                >
                  {marketers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role || 'MDO'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Day Multi-Picker */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">2. Recurring Weekdays *</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = customizeForm.days.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => {
                          if (isSelected) {
                            if (customizeForm.days.length > 1) {
                              setCustomizeForm((f) => ({ ...f, days: f.days.filter((d) => d !== day) }));
                            }
                          } else {
                            setCustomizeForm((f) => ({ ...f, days: [...f.days, day] }));
                          }
                        }}
                        className={`p-2 rounded-xl text-xs font-black transition-all ${
                          isSelected
                            ? 'bg-red-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Market Selector + Add New Market */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700 uppercase">3. Assigned Market / Territory *</label>
                  <button
                    type="button"
                    onClick={() => setShowAddMarketModal(true)}
                    className="text-[11px] font-black text-red-700 hover:underline"
                  >
                    + Add New Market
                  </button>
                </div>
                <select
                  value={customizeForm.marketId}
                  onChange={(e) => setCustomizeForm((f) => ({ ...f, marketId: e.target.value }))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-red-600 outline-none"
                >
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.district || 'MP'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Shift Timing */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">Start Time</label>
                  <input
                    type="text"
                    value={customizeForm.startTime}
                    onChange={(e) => setCustomizeForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">Expected End Time</label>
                  <input
                    type="text"
                    value={customizeForm.endTime}
                    onChange={(e) => setCustomizeForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                  />
                </div>
              </div>

              {/* Priority & Status */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">Route Priority</label>
                  <select
                    value={customizeForm.priority}
                    onChange={(e) => setCustomizeForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High Priority">High Priority</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">Schedule Status</label>
                  <select
                    value={customizeForm.active ? 'true' : 'false'}
                    onChange={(e) => setCustomizeForm((f) => ({ ...f, active: e.target.value === 'true' }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                  >
                    <option value="true">Active Schedule</option>
                    <option value="false">Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">Admin Notes / Area Details</label>
                <input
                  type="text"
                  placeholder="e.g., Cover Main Mandi first, then Station road shops"
                  value={customizeForm.notes}
                  onChange={(e) => setCustomizeForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCustomizeModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-red-700 hover:bg-red-800 text-white font-black rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Weekly Route ✓</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE TEMPORARY DATE OVERRIDE                                   */}
      {/* ========================================================================= */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">CREATE SINGLE-DAY ROUTE OVERRIDE</h2>
                <p className="text-xs text-slate-500">
                  Override recurring route for a specific date without permanently modifying weekly schedule.
                </p>
              </div>
              <button onClick={() => setShowOverrideModal(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOverride} className="space-y-4 text-xs">
              {/* Target Date */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">1. Override Target Date *</label>
                <input
                  type="text"
                  required
                  placeholder="DD-MM-YYYY"
                  value={overrideForm.date}
                  onChange={(e) => setOverrideForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Day of week: <strong>{getDayNameFromDate(overrideForm.date)}</strong>
                </span>
              </div>

              {/* Marketer Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">2. Select Marketer *</label>
                <select
                  value={overrideForm.marketerId}
                  onChange={(e) => setOverrideForm((f) => ({ ...f, marketerId: e.target.value }))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900"
                >
                  {marketers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role || 'MDO'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Original Route Dynamic Display */}
              {(() => {
                const dayName = getDayNameFromDate(overrideForm.date);
                const original = weeklyRoutes.find(
                  (r) => r.marketerId === overrideForm.marketerId && r.day?.toLowerCase() === dayName.toLowerCase()
                );
                return (
                  <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 font-bold">Regular Recurring Route for {dayName}:</span>
                    <span className="font-extrabold text-slate-900 uppercase">
                      {original ? original.marketName : 'Off / Unassigned'}
                    </span>
                  </div>
                );
              })()}

              {/* Temporary Market */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700 uppercase">3. New Temporary Market *</label>
                  <button
                    type="button"
                    onClick={() => setShowAddMarketModal(true)}
                    className="text-[11px] font-black text-red-700 hover:underline"
                  >
                    + Add New Market
                  </button>
                </div>
                <select
                  value={overrideForm.marketId}
                  onChange={(e) => setOverrideForm((f) => ({ ...f, marketId: e.target.value }))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900"
                >
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.district || 'MP'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Predefined Reasons */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">4. Predefined Reason *</label>
                <select
                  value={overrideForm.reasonOption}
                  onChange={(e) => setOverrideForm((f) => ({ ...f, reasonOption: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900"
                >
                  {PREDEFINED_OVERRIDE_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {overrideForm.reasonOption === 'Other' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">Specify Custom Reason *</label>
                  <input
                    type="text"
                    required
                    placeholder="Provide specific justification..."
                    value={overrideForm.customReason}
                    onChange={(e) => setOverrideForm((f) => ({ ...f, customReason: e.target.value }))}
                    className="w-full bg-slate-50 border border-red-300 rounded-xl p-2.5 font-bold text-slate-900"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">Start Time</label>
                  <input
                    type="text"
                    value={overrideForm.startTime}
                    onChange={(e) => setOverrideForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">End Time</label>
                  <input
                    type="text"
                    value={overrideForm.endTime}
                    onChange={(e) => setOverrideForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-4 h-4" />
                  <span>Create Override ✓</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MARKETER ABSENCE / SUBSTITUTE ASSIGNMENT                          */}
      {/* ========================================================================= */}
      {showSubstituteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">MARK ABSENCE & ASSIGN SUBSTITUTE</h2>
                <p className="text-xs text-slate-500">
                  Cover field routes when an officer is on leave without changing permanent schedules.
                </p>
              </div>
              <button onClick={() => setShowSubstituteModal(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubstitute} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">Date (DD-MM-YYYY) *</label>
                <input
                  type="text"
                  required
                  value={substituteForm.date}
                  onChange={(e) => setSubstituteForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">Absent Officer *</label>
                <select
                  value={substituteForm.absentMarketerId}
                  onChange={(e) => setSubstituteForm((f) => ({ ...f, absentMarketerId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900"
                >
                  {marketers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role || 'MDO'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">Assign Substitute Officer *</label>
                <select
                  value={substituteForm.substituteMarketerId}
                  onChange={(e) => setSubstituteForm((f) => ({ ...f, substituteMarketerId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900"
                >
                  {marketers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role || 'MDO'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">Absence Reason</label>
                <select
                  value={substituteForm.reasonOption}
                  onChange={(e) => setSubstituteForm((f) => ({ ...f, reasonOption: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                >
                  {PREDEFINED_OVERRIDE_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubstituteModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-700 hover:bg-blue-800 text-white font-black rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Assign Substitute ✓</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: COPY ROUTE / DUPLICATOR                                          */}
      {/* ========================================================================= */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">COPY ROUTE SCHEDULE</h2>
                <p className="text-xs text-slate-500">Duplicate recurring itineraries across days or marketers.</p>
              </div>
              <button onClick={() => setShowCopyModal(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteCopy} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">Copy Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCopyForm((f) => ({ ...f, mode: 'DAY_TO_DAY' }))}
                    className={`p-2.5 rounded-xl font-black border text-xs ${
                      copyForm.mode === 'DAY_TO_DAY'
                        ? 'bg-slate-900 text-amber-300 border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Day to Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopyForm((f) => ({ ...f, mode: 'MARKETER_TO_MARKETER' }))}
                    className={`p-2.5 rounded-xl font-black border text-xs ${
                      copyForm.mode === 'MARKETER_TO_MARKETER'
                        ? 'bg-slate-900 text-amber-300 border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Entire Week (MDO to MDO)
                  </button>
                </div>
              </div>

              {copyForm.mode === 'DAY_TO_DAY' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase">Source Day (Copy From)</label>
                    <select
                      value={copyForm.fromDay}
                      onChange={(e) => setCopyForm((f) => ({ ...f, fromDay: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                    >
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase">Target Day (Copy To)</label>
                    <select
                      value={copyForm.toDay}
                      onChange={(e) => setCopyForm((f) => ({ ...f, toDay: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                    >
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase">Source MDO</label>
                    <select
                      value={copyForm.fromMarketerId}
                      onChange={(e) => setCopyForm((f) => ({ ...f, fromMarketerId: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                    >
                      {marketers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase">Target MDO</label>
                    <select
                      value={copyForm.toMarketerId}
                      onChange={(e) => setCopyForm((f) => ({ ...f, toMarketerId: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                    >
                      {marketers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCopyModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-4 h-4 text-amber-300" />
                  <span>Execute Copy Schedule ✓</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFLICT RESOLUTION MODAL                                                 */}
      {/* ========================================================================= */}
      {conflictPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">ROUTE CONFLICT DETECTED</h3>
              <p className="text-xs text-slate-600 mt-1 font-medium">{conflictPrompt.message}</p>
            </div>

            <div className="space-y-2 text-xs font-bold pt-2">
              <button
                type="button"
                onClick={conflictPrompt.onReplace}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm"
              >
                Replace Existing Assignment
              </button>
              <button
                type="button"
                onClick={conflictPrompt.onConfirm}
                className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl shadow-sm"
              >
                Continue Anyway (Allow Double Booking)
              </button>
              <button
                type="button"
                onClick={conflictPrompt.onCancel}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK ADD MARKET MODAL                                                    */}
      {/* ========================================================================= */}
      {showAddMarketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-black text-slate-900 text-sm uppercase">Quick Add New Market</h3>
              <button onClick={() => setShowAddMarketModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveQuickMarket} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Market / Mandi Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suncity Market, Berchha"
                  value={newMarketName}
                  onChange={(e) => setNewMarketName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">District</label>
                <input
                  type="text"
                  value={newMarketDistrict}
                  onChange={(e) => setNewMarketDistrict(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddMarketModal(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 bg-red-700 text-white font-bold rounded-xl shadow-sm">
                  Create Market
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
