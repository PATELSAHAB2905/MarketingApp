import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  calculateMarketerMonthlyMetrics,
  calculateMonthWorkingDays,
  parseMonthYear,
  MONTH_NAMES,
} from '../../utils/targetEngine';
import MarketerTargetPacingCard from '../../components/common/MarketerTargetPacingCard';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  TrendingUp,
  Users,
  ChevronDown,
  AlertTriangle,
  Calendar,
  BarChart3,
  Award,
  Filter,
  Search,
  History,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Eye,
  Settings,
} from 'lucide-react';

export default function TargetManagement() {
  const {
    marketers = [],
    targets = [],
    addTarget,
    updateTarget,
    deleteTarget,
    orders = [],
    returns = [],
    weeklyRoutes = [],
    getFormattedDate,
  } = useData();

  const [activeTab, setActiveTab] = useState('monitoring'); // 'monitoring' | 'configurations'
  const [selectedMonth, setSelectedMonth] = useState('September 2026');
  const [filterMarketerId, setFilterMarketerId] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'AHEAD' | 'ON_TRACK' | 'BEHIND'
  const [searchQuery, setSearchQuery] = useState('');

  // Target Detail Modal
  const [viewingMarketerId, setViewingMarketerId] = useState(null);

  // Add / Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);

  const [formMarketerId, setFormMarketerId] = useState(marketers[0]?.id || '');
  const [formMonth, setFormMonth] = useState('September 2026');
  const [formMonthlyKg, setFormMonthlyKg] = useState('3380');
  const [formWorkingDays, setFormWorkingDays] = useState('26');
  const [formReason, setFormReason] = useState('Monthly Target Setup');
  const [formNotes, setFormNotes] = useState('');

  // Auto-compute working days when month or marketer changes
  const autoWorkingDays = useMemo(() => {
    const monthInfo = parseMonthYear(formMonth);
    const { totalWorkingDays } = calculateMonthWorkingDays({
      year: monthInfo.year,
      monthIndex: monthInfo.monthIndex,
      marketerId: formMarketerId,
      weeklyRoutes,
    });
    return totalWorkingDays || 26;
  }, [formMonth, formMarketerId, weeklyRoutes]);

  const formDailyKg = useMemo(() => {
    const mKg = Number(formMonthlyKg) || 0;
    const wDays = Number(formWorkingDays) || 26;
    return wDays > 0 ? Math.round((mKg / wDays) * 10) / 10 : 0;
  }, [formMonthlyKg, formWorkingDays]);

  const handleOpenAdd = () => {
    setEditingTarget(null);
    setFormMarketerId(marketers[0]?.id || '');
    setFormMonth(selectedMonth);
    setFormMonthlyKg('3380');
    setFormWorkingDays(String(autoWorkingDays));
    setFormReason('Monthly Target Setup');
    setFormNotes('');
    setShowEditModal(true);
  };

  const handleOpenEdit = (tgt) => {
    setEditingTarget(tgt);
    setFormMarketerId(tgt.marketerId);
    setFormMonth(tgt.month || selectedMonth);
    setFormMonthlyKg(String(tgt.monthlyKg || 3380));
    setFormWorkingDays(String(tgt.workingDays || 26));
    setFormReason('Target Adjustment');
    setFormNotes(tgt.notes || '');
    setShowEditModal(true);
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formMarketerId || !formMonthlyKg || !formWorkingDays) {
      alert('Please fill all required target fields.');
      return;
    }

    const marketerObj = marketers.find((m) => m.id === formMarketerId);
    const monthInfo = parseMonthYear(formMonth);

    const payload = {
      marketerId: formMarketerId,
      marketerName: marketerObj?.name || 'Marketer',
      month: monthInfo.displayMonth,
      monthKey: monthInfo.monthKey,
      monthlyKg: Number(formMonthlyKg),
      workingDays: Number(formWorkingDays),
      dailyKg: formDailyKg,
      reason: formReason,
      notes: formNotes,
      changedBy: 'Admin',
    };

    if (editingTarget?.id) {
      updateTarget(editingTarget.id, payload);
    } else {
      addTarget(payload);
    }

    setShowEditModal(false);
  };

  // Compute all marketers metrics for the selected month
  const marketersMetricsList = useMemo(() => {
    return marketers.map((m) => {
      const metrics = calculateMarketerMonthlyMetrics({
        marketerId: m.id,
        marketerName: m.name,
        monthStr: selectedMonth,
        targets,
        orders,
        returns,
        weeklyRoutes,
        todayDateStr: getFormattedDate(),
      });
      return {
        marketer: m,
        ...metrics,
      };
    }).filter((row) => {
      if (filterMarketerId !== 'ALL' && row.marketerId !== filterMarketerId) return false;
      if (filterStatus !== 'ALL' && row.paceStatus !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        if (!row.marketerName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [marketers, selectedMonth, targets, orders, returns, weeklyRoutes, getFormattedDate, filterMarketerId, filterStatus, searchQuery]);

  // Overall Totals
  const summaryKPIs = useMemo(() => {
    const totalTarget = marketersMetricsList.reduce((s, r) => s + r.monthlyTargetKg, 0);
    const totalActual = marketersMetricsList.reduce((s, r) => s + r.actualAchievementKg, 0);
    const totalExpected = marketersMetricsList.reduce((s, r) => s + r.expectedTargetTillToday, 0);
    const totalRemaining = marketersMetricsList.reduce((s, r) => s + r.remainingTargetKg, 0);

    const overallPacePct = totalExpected > 0
      ? Math.round(((totalActual - totalExpected) / totalExpected) * 1000) / 10
      : 0;

    const overallAchPct = totalTarget > 0
      ? Math.round((totalActual / totalTarget) * 1000) / 10
      : 0;

    return {
      totalTarget,
      totalActual,
      totalExpected,
      totalRemaining,
      overallPacePct,
      overallAchPct,
    };
  }, [marketersMetricsList]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-red-700 text-white rounded-md text-[10px] font-black uppercase">
              ADMIN CONTROL
            </span>
            <span className="text-xs text-slate-500 font-bold">{selectedMonth}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight mt-1 flex items-center gap-2">
            <Target className="w-7 h-7 text-red-700" />
            <span>MARKETER MONTHLY TARGET & PACING SYSTEM</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Monitor expected run-rate, cumulative target pacing, and configure monthly targets per marketer.
          </p>
        </div>

        {/* Month Selector & Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-600 ml-1.5" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-900 focus:outline-hidden pr-2"
            >
              <option value="September 2026">September 2026</option>
              <option value="August 2026">August 2026</option>
              <option value="October 2026">October 2026</option>
            </select>
          </div>

          <button
            onClick={handleOpenAdd}
            className="py-3 px-5 bg-gradient-to-r from-red-700 to-amber-700 hover:from-red-800 hover:to-amber-800 text-white rounded-2xl font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Configure Target</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Monthly Target */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Monthly Target</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">{summaryKPIs.totalTarget.toLocaleString('en-IN')} KG</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Combined Field Target ({marketers.length} Marketers)</p>
          </div>
        </div>

        {/* KPI 2: Actual Achievement */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sales Achieved</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-emerald-700">{summaryKPIs.totalActual.toLocaleString('en-IN')} KG</h3>
            <p className="text-xs text-emerald-600 font-bold mt-0.5">{summaryKPIs.overallAchPct}% of Monthly Target</p>
          </div>
        </div>

        {/* KPI 3: Expected Target Till Today */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expected Till Today</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-amber-900">{summaryKPIs.totalExpected.toLocaleString('en-IN')} KG</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Based on Elapsed Working Days</p>
          </div>
        </div>

        {/* KPI 4: Overall Pace */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Team Target Pace</span>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3
              className={`text-2xl font-black ${
                summaryKPIs.overallPacePct >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {summaryKPIs.overallPacePct >= 0 ? `+${summaryKPIs.overallPacePct}%` : `${summaryKPIs.overallPacePct}%`}
            </h3>
            <p className="text-xs font-bold mt-0.5 text-slate-700">
              {summaryKPIs.overallPacePct >= 0 ? '🟢 Ahead of Target Pace' : '🔴 Behind Target Pace'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTab === 'monitoring'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-red-700" />
          <span>Monthly Target Monitoring Table</span>
        </button>

        <button
          onClick={() => setActiveTab('configurations')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTab === 'configurations'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings className="w-4 h-4 text-amber-700" />
          <span>Target Settings & History Log</span>
        </button>
      </div>

      {/* 4. Tab 1: Monthly Target Monitoring Table (Requirement #15) */}
      {activeTab === 'monitoring' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                <span>MARKETER MONTHLY TARGET & PACING MONITORING ({selectedMonth})</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Operational monitoring table comparing actual achievement against expected run-rate.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search Marketer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
              >
                <option value="ALL">All Status</option>
                <option value="AHEAD">🟢 Ahead</option>
                <option value="ON_TRACK">🟡 On Track</option>
                <option value="BEHIND">🔴 Behind</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] text-slate-400 uppercase font-extrabold">
                  <th className="pb-3 px-3">Marketer</th>
                  <th className="pb-3 px-3 text-right">Monthly Target</th>
                  <th className="pb-3 px-3 text-right">Achievement</th>
                  <th className="pb-3 px-3 text-right">Ach %</th>
                  <th className="pb-3 px-3 text-right">Expected Till Today</th>
                  <th className="pb-3 px-3 text-center">Target Pace</th>
                  <th className="pb-3 px-3 text-right">Remaining</th>
                  <th className="pb-3 px-3 text-right">Req. Run-Rate</th>
                  <th className="pb-3 px-3 text-center">Status</th>
                  <th className="pb-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {marketersMetricsList.map((row) => {
                  return (
                    <tr key={row.marketerId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-3">
                        <span className="font-extrabold text-slate-900 text-sm block">{row.marketerName}</span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          {row.marketer?.mobile} • {row.totalWorkingDays} Working Days
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-black text-slate-900 text-sm">
                        {row.monthlyTargetKg.toLocaleString('en-IN')} KG
                        <span className="block text-[10px] text-slate-400 font-normal">{row.dailyTargetKg} KG/day</span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-black text-emerald-800 text-sm">
                        {row.actualAchievementKg.toLocaleString('en-IN')} KG
                        <span className="block text-[10px] text-slate-400 font-normal">{row.totalOrdersCount} Orders</span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-black">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-lg text-slate-900">
                          {row.achievementPct}%
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-slate-800">
                        {row.expectedTargetTillToday.toLocaleString('en-IN')} KG
                        <span className="block text-[10px] text-slate-400 font-normal">{row.elapsedWorkingDays} Days Elapsed</span>
                      </td>

                      <td className="py-3.5 px-3 text-center font-extrabold">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black ${
                            row.paceStatus === 'AHEAD'
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.paceStatus === 'BEHIND'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {row.paceStatus === 'AHEAD' && `+${Math.abs(row.paceDiffPct).toFixed(1)}%`}
                          {row.paceStatus === 'BEHIND' && `-${Math.abs(row.paceDiffPct).toFixed(1)}%`}
                          {row.paceStatus === 'ON_TRACK' && '±0.0%'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold">
                        <span className={row.isTargetAchieved ? 'text-emerald-700 font-black' : 'text-slate-800'}>
                          {row.isTargetAchieved ? '0 KG' : `${row.remainingTargetKg.toLocaleString('en-IN')} KG`}
                        </span>
                        {row.exceededByKg > 0 && (
                          <span className="block text-[9px] text-emerald-600 font-bold">+{row.exceededByKg} KG Exceeded</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-purple-900">
                        {row.requiredDailyRunRate} KG/day
                        <span className="block text-[10px] text-purple-600 font-medium">{row.remainingWorkingDays} Days Left</span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            row.paceStatus === 'AHEAD'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : row.paceStatus === 'BEHIND'
                              ? 'bg-red-50 text-red-800 border border-red-300'
                              : 'bg-amber-50 text-amber-800 border border-amber-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              row.paceStatus === 'AHEAD'
                                ? 'bg-emerald-500'
                                : row.paceStatus === 'BEHIND'
                                ? 'bg-red-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          <span>{row.paceStatus === 'AHEAD' ? 'AHEAD' : row.paceStatus === 'BEHIND' ? 'BEHIND' : 'ON TRACK'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewingMarketerId(row.marketerId)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            title="View Full Target & Pacing Analytics"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(row.targetRecord || { marketerId: row.marketerId, monthlyKg: row.monthlyTargetKg })}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            title="Edit Target"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Target Settings & History Log (Requirement #17 & #18) */}
      {activeTab === 'configurations' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase">
                  MONTHLY TARGET CONFIGURATION & AUDIT HISTORY
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Configured targets and historical change logs preserved for compliance.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {marketers.map((m) => {
                const targetRecord = targets.find((t) => t.marketerId === m.id && (t.month === selectedMonth || t.monthKey === parseMonthYear(selectedMonth).monthKey)) ||
                  targets.find((t) => t.marketerId === m.id && t.active !== false) || null;

                const historyLogs = targetRecord?.targetHistory || [];

                return (
                  <div key={m.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-700 text-white flex items-center justify-center font-black">
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-base">{m.name}</h4>
                          <p className="text-xs text-slate-500">{m.mobile} • {selectedMonth}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-bold">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Monthly Target</span>
                          <span className="text-slate-900 font-black text-base">{targetRecord?.monthlyKg || 3380} KG</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Working Days</span>
                          <span className="text-slate-800 font-extrabold">{targetRecord?.workingDays || 26} Days</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Daily Target</span>
                          <span className="text-slate-800 font-extrabold">{targetRecord?.dailyKg || 130} KG/day</span>
                        </div>

                        <button
                          onClick={() => handleOpenEdit(targetRecord || { marketerId: m.id })}
                          className="py-2 px-3.5 bg-slate-900 text-amber-300 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Target</span>
                        </button>
                      </div>
                    </div>

                    {/* History Logs */}
                    {historyLogs.length > 0 && (
                      <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
                        <span className="font-extrabold text-slate-600 text-[10px] uppercase flex items-center gap-1">
                          <History className="w-3.5 h-3.5 text-slate-400" />
                          <span>Target Change History ({historyLogs.length} Records)</span>
                        </span>
                        <div className="space-y-1">
                          {historyLogs.map((h, hIdx) => (
                            <div key={hIdx} className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex justify-between items-center text-[11px]">
                              <div>
                                <span className="font-black text-slate-900">{h.monthlyKg} KG</span>
                                <span className="text-slate-400"> ({h.dailyKg} KG/day • {h.workingDays} days)</span>
                                <p className="text-slate-500 italic mt-0.5">"{h.reason}"</p>
                              </div>
                              <div className="text-right text-[10px] text-slate-400 font-semibold">
                                <div>{h.timestamp ? new Date(h.timestamp).toLocaleDateString('en-GB') : '—'}</div>
                                <div className="text-slate-600 font-bold">{h.changedBy || 'Admin'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 6. Marketer Detail / Analytics Modal */}
      {viewingMarketerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-red-900 via-slate-900 to-slate-900 text-white p-5 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
                  MARKETER TARGET ANALYTICS
                </p>
                <h2 className="text-xl font-black mt-0.5">
                  {marketers.find((m) => m.id === viewingMarketerId)?.name || 'Marketer'}
                </h2>
              </div>
              <button
                onClick={() => setViewingMarketerId(null)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <MarketerTargetPacingCard marketerId={viewingMarketerId} initialMonth={selectedMonth} />
            </div>
          </div>
        </div>
      )}

      {/* 7. Configure / Edit Monthly Target Modal (Requirement #18) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-red-900 via-amber-900 to-amber-800 text-white p-5 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">TARGET CONFIGURATION</p>
                <h2 className="text-lg font-black mt-0.5">
                  {editingTarget ? 'Update Marketer Monthly Target' : 'Set New Monthly Target'}
                </h2>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4 text-xs overflow-y-auto">
              {/* Marketer Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">1. Select Marketer *</label>
                <select
                  value={formMarketerId}
                  onChange={(e) => setFormMarketerId(e.target.value)}
                  disabled={Boolean(editingTarget)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-900 focus:ring-2 focus:ring-red-600 outline-none"
                >
                  {marketers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role || 'MDO'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">2. Target Month *</label>
                <select
                  value={formMonth}
                  onChange={(e) => {
                    setFormMonth(e.target.value);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-900 focus:ring-2 focus:ring-red-600 outline-none"
                >
                  <option value="September 2026">September 2026</option>
                  <option value="August 2026">August 2026</option>
                  <option value="October 2026">October 2026</option>
                  <option value="November 2026">November 2026</option>
                  <option value="December 2026">December 2026</option>
                </select>
              </div>

              {/* Target Numbers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">3. Monthly Target (KG) *</label>
                  <input
                    type="number"
                    value={formMonthlyKg}
                    onChange={(e) => setFormMonthlyKg(e.target.value)}
                    placeholder="e.g. 3380"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-slate-900 text-sm focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">4. Working Days in Month *</label>
                  <input
                    type="number"
                    value={formWorkingDays}
                    onChange={(e) => setFormWorkingDays(e.target.value)}
                    placeholder="e.g. 26"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-slate-900 text-sm focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              {/* Auto Calculated Preview Card */}
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-amber-800 font-bold uppercase block">Auto-Calculated Daily Target</span>
                  <span className="text-xl font-black text-amber-950">{formDailyKg} KG/day</span>
                </div>
                <div className="text-right text-[11px] text-amber-900 font-semibold">
                  <span>{formMonthlyKg || 0} ÷ {formWorkingDays || 26} days</span>
                </div>
              </div>

              {/* Reason / Change Note */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">Reason for Target Setup / Revision</label>
                <input
                  type="text"
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="e.g. Festival demand increase / Standard monthly quota"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-red-700 to-amber-700 text-white rounded-xl font-black shadow-md active:scale-95"
                >
                  Save Target Configuration →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
