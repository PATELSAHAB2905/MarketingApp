import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Award,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from 'lucide-react';

export default function MarketerTargetPacingCard({ marketerId, initialMonth = 'September 2026', compact = false }) {
  const { getMarketerTargetMetrics, getFormattedDate } = useData();
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [showTable, setShowTable] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const [weekFilter, setWeekFilter] = useState('ALL'); // 'ALL' | 'W1' | 'W2' | 'W3' | 'W4' | 'W5'

  const metrics = useMemo(() => {
    if (!getMarketerTargetMetrics) return null;
    return getMarketerTargetMetrics(marketerId, selectedMonth);
  }, [getMarketerTargetMetrics, marketerId, selectedMonth]);

  if (!metrics) return null;

  const {
    month,
    monthlyTargetKg,
    totalWorkingDays,
    dailyTargetKg,
    elapsedWorkingDays,
    remainingWorkingDays,
    expectedTargetTillToday,
    actualAchievementKg,
    achievementPct,
    remainingTargetKg,
    exceededByKg,
    isTargetAchieved,
    paceDiffKg,
    paceDiffPct,
    paceStatus,
    paceLabel,
    requiredDailyRunRate,
    todayTargetKg,
    todayAchievementKg,
    todayDiffKg,
    todayDiffPct,
    todayStatus,
    dailyBreakdown = [],
    cumChartData = [],
  } = metrics;

  // Expected vs actual progress percentages
  const expectedPct = monthlyTargetKg > 0
    ? Math.min(100, Math.round((expectedTargetTillToday / monthlyTargetKg) * 1000) / 10)
    : 0;

  const actualClampedPct = Math.min(100, achievementPct);

  // Filter daily breakdown by week if selected
  const filteredDailyBreakdown = useMemo(() => {
    if (weekFilter === 'ALL') return dailyBreakdown;
    return dailyBreakdown.filter((item) => {
      const day = item.dayNumber;
      if (weekFilter === 'W1') return day >= 1 && day <= 7;
      if (weekFilter === 'W2') return day >= 8 && day <= 14;
      if (weekFilter === 'W3') return day >= 15 && day <= 21;
      if (weekFilter === 'W4') return day >= 22 && day <= 28;
      if (weekFilter === 'W5') return day >= 29;
      return true;
    });
  }, [dailyBreakdown, weekFilter]);

  // Chart coordinate calculations (SVG responsive)
  const chartMaxY = Math.max(monthlyTargetKg * 1.05, actualAchievementKg * 1.1, 100);
  const chartPoints = useMemo(() => {
    if (!cumChartData.length) return { expected: '', actual: '' };
    const width = 360;
    const height = 140;
    const paddingX = 20;
    const paddingY = 15;
    const usableW = width - paddingX * 2;
    const usableH = height - paddingY * 2;

    const totalDays = dailyBreakdown.length || 30;

    const getX = (day) => paddingX + ((day - 1) / (totalDays - 1)) * usableW;
    const getY = (val) => height - paddingY - (val / chartMaxY) * usableH;

    const expectedPts = dailyBreakdown.map((d) => `${getX(d.dayNumber)},${getY(d.cumExpectedKg)}`).join(' ');
    
    const passedDays = dailyBreakdown.filter((d) => d.cumActualKg !== null);
    const actualPts = passedDays.map((d) => `${getX(d.dayNumber)},${getY(d.cumActualKg)}`).join(' ');

    return { expected: expectedPts, actual: actualPts, getX, getY, height, width };
  }, [dailyBreakdown, cumChartData, chartMaxY]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
      {/* 1. Card Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-red-600 text-white rounded-md text-[10px] font-black uppercase tracking-wider">
              MONTHLY TARGET
            </span>
            <span className="text-xs text-slate-300 font-bold">{month}</span>
          </div>
          <h3 className="text-xl font-black text-white mt-0.5 tracking-tight flex items-center gap-2">
            <span>MONTHLY PERFORMANCE</span>
          </h3>
        </div>

        {/* Month Selector & Pace Badge */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-800 text-amber-300 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-hidden"
          >
            <option value="September 2026">Sep 2026</option>
            <option value="August 2026">Aug 2026</option>
            <option value="October 2026">Oct 2026</option>
          </select>

          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border shadow-xs ${
              paceStatus === 'AHEAD'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : paceStatus === 'BEHIND'
                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
          >
            {paceStatus === 'AHEAD' && <ArrowUpRight className="w-4 h-4 text-emerald-400" />}
            {paceStatus === 'BEHIND' && <ArrowDownRight className="w-4 h-4 text-red-400" />}
            {paceStatus === 'ON_TRACK' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
            <span>
              {paceStatus === 'AHEAD'
                ? `🟢 +${Math.abs(paceDiffPct).toFixed(1)}% Ahead`
                : paceStatus === 'BEHIND'
                ? `🔴 ${Math.abs(paceDiffPct).toFixed(1)}% Behind`
                : '🟡 On Track'}
            </span>
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* 2. Visual Progress Bar with Expected Pace Marker */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-extrabold text-slate-700 uppercase tracking-wide">Target Progress</span>
            <div className="flex items-center gap-2 font-bold">
              <span className="text-slate-500">
                {actualAchievementKg.toLocaleString('en-IN')} / {monthlyTargetKg.toLocaleString('en-IN')} KG
              </span>
              <span className="text-base font-black text-slate-900 bg-amber-200/70 px-2 py-0.5 rounded-lg">
                {achievementPct}%
              </span>
            </div>
          </div>

          <div className="relative w-full h-4 bg-slate-200 rounded-full overflow-hidden">
            {/* Expected Target till today background zone */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-slate-300/60 transition-all duration-300"
              style={{ width: `${expectedPct}%` }}
              title={`Expected Progress till today: ${expectedPct}% (${expectedTargetTillToday} KG)`}
            />

            {/* Actual Progress Bar */}
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                paceStatus === 'AHEAD'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                  : paceStatus === 'BEHIND'
                  ? 'bg-gradient-to-r from-amber-500 to-red-600'
                  : 'bg-gradient-to-r from-amber-400 to-amber-600'
              }`}
              style={{ width: `${actualClampedPct}%` }}
            />
          </div>

          {/* Pace status caption below progress bar */}
          <div className="flex justify-between items-center text-[11px] pt-1">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Expected Pace till today: <strong>{expectedTargetTillToday.toLocaleString('en-IN')} KG</strong> ({expectedPct}%)
              </span>
            </span>

            <span className="font-extrabold text-slate-800">
              {paceStatus === 'AHEAD' ? (
                <span className="text-emerald-700">🟢 +{Math.abs(paceDiffKg)} KG Ahead</span>
              ) : paceStatus === 'BEHIND' ? (
                <span className="text-red-700">🔴 {Math.abs(paceDiffKg)} KG Behind</span>
              ) : (
                <span className="text-amber-700">🟡 Exact Target Pace</span>
              )}
            </span>
          </div>
        </div>

        {/* 3. The 8 Exact Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {/* 1. Monthly Target */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-0.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Monthly Target</span>
            <span className="text-lg font-black text-slate-900">{monthlyTargetKg.toLocaleString('en-IN')} KG</span>
            <span className="text-[10px] text-slate-400 block font-medium">{totalWorkingDays} Working Days</span>
          </div>

          {/* 2. Daily Target */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-0.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Daily Target</span>
            <span className="text-lg font-black text-slate-900">{dailyTargetKg} KG/day</span>
            <span className="text-[10px] text-slate-400 block font-medium">Standard Daily Rate</span>
          </div>

          {/* 3. Target Till Today */}
          <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 space-y-0.5">
            <span className="text-[10px] text-amber-900 font-bold uppercase block">Target Till Today</span>
            <span className="text-lg font-black text-amber-950">{expectedTargetTillToday.toLocaleString('en-IN')} KG</span>
            <span className="text-[10px] text-amber-800 block font-medium">{elapsedWorkingDays} Days Elapsed</span>
          </div>

          {/* 4. Actual Achievement */}
          <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200 space-y-0.5">
            <span className="text-[10px] text-emerald-900 font-bold uppercase block">Actual Achievement</span>
            <span className="text-lg font-black text-emerald-900">{actualAchievementKg.toLocaleString('en-IN')} KG</span>
            <span className="text-[10px] text-emerald-700 block font-bold">{achievementPct}% Achieved</span>
          </div>

          {/* 5. Achievement % */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-0.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Achievement %</span>
            <span className="text-lg font-black text-slate-900">{achievementPct}%</span>
            <span className="text-[10px] text-slate-400 block font-medium">of Monthly Target</span>
          </div>

          {/* 6. Remaining Target */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-0.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Remaining</span>
            <span className={`text-lg font-black ${isTargetAchieved ? 'text-emerald-700' : 'text-red-700'}`}>
              {isTargetAchieved ? '0 KG' : `${remainingTargetKg.toLocaleString('en-IN')} KG`}
            </span>
            <span className="text-[10px] text-slate-500 block font-medium">
              {exceededByKg > 0 ? `+${exceededByKg} KG Exceeded!` : `${remainingWorkingDays} Days Left`}
            </span>
          </div>

          {/* 7. Target Pace */}
          <div
            className={`p-3 rounded-2xl border space-y-0.5 ${
              paceStatus === 'AHEAD'
                ? 'bg-emerald-50 border-emerald-200'
                : paceStatus === 'BEHIND'
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <span className="text-[10px] font-bold uppercase block text-slate-600">Target Pace</span>
            <span
              className={`text-lg font-black ${
                paceStatus === 'AHEAD'
                  ? 'text-emerald-800'
                  : paceStatus === 'BEHIND'
                  ? 'text-red-800'
                  : 'text-amber-800'
              }`}
            >
              {paceStatus === 'AHEAD' ? `+${Math.abs(paceDiffPct).toFixed(1)}%` : paceStatus === 'BEHIND' ? `-${Math.abs(paceDiffPct).toFixed(1)}%` : '±0.0%'}
            </span>
            <span className="text-[10px] font-extrabold block text-slate-700">
              {paceStatus === 'AHEAD' ? '🟢 Ahead of Pace' : paceStatus === 'BEHIND' ? '🔴 Behind Pace' : '🟡 On Track'}
            </span>
          </div>

          {/* 8. Required From Now (Daily Average) */}
          <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-200 space-y-0.5">
            <span className="text-[10px] text-purple-900 font-bold uppercase block">Required From Now</span>
            <span className="text-lg font-black text-purple-950">{requiredDailyRunRate} KG/day</span>
            <span className="text-[10px] text-purple-800 block font-medium">for remaining {remainingWorkingDays} days</span>
          </div>
        </div>

        {/* 4. Today's Performance Sub-Card */}
        <div className="bg-gradient-to-r from-amber-500/10 via-red-500/5 to-amber-500/10 border border-amber-300/60 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 bg-amber-500 text-slate-950 rounded font-black text-[9px] uppercase">
                TODAY'S RUN-RATE
              </span>
              <span className="font-extrabold text-slate-800">Target: {todayTargetKg} KG</span>
            </div>
            <p className="text-slate-600 font-medium mt-1">
              Today's Orders Achieved: <strong className="text-slate-900 text-sm font-black">{todayAchievementKg} KG</strong>
            </p>
          </div>

          <div>
            <span
              className={`px-3 py-1.5 rounded-xl font-black text-xs inline-flex items-center gap-1 border shadow-2xs ${
                todayStatus === 'ABOVE'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : todayStatus === 'BELOW'
                  ? 'bg-red-100 text-red-900 border-red-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}
            >
              {todayStatus === 'ABOVE' ? (
                <span>🟢 +{Math.abs(todayDiffPct).toFixed(1)}% Above Today's Target (+{Math.abs(todayDiffKg)} KG)</span>
              ) : todayStatus === 'BELOW' ? (
                <span>🔴 {Math.abs(todayDiffPct).toFixed(1)}% Below Today's Target (-{Math.abs(todayDiffKg)} KG)</span>
              ) : (
                <span>🟡 Target Met for Today ({todayAchievementKg} KG)</span>
              )}
            </span>
          </div>
        </div>

        {/* 5. Cumulative Target vs Achievement Interactive Chart */}
        {!compact && (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-red-700" />
                  <span>CUMULATIVE PERFORMANCE (EXPECTED VS ACTUAL)</span>
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Track whether your sales trend line is above or below the target pace line
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-3 text-[10px] font-bold">
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-3 h-0.5 bg-slate-400 border-b border-dashed border-slate-700" />
                  Expected Target
                </span>
                <span className="flex items-center gap-1 text-emerald-700">
                  <span className="w-3 h-1 bg-emerald-600 rounded-full" />
                  Actual Sales
                </span>
              </div>
            </div>

            {/* SVG Visual Chart */}
            <div className="w-full overflow-x-auto">
              <svg viewBox="0 0 360 140" className="w-full h-36">
                {/* Background Grid Lines */}
                <line x1="20" y1="20" x2="340" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" />
                <line x1="20" y1="70" x2="340" y2="70" stroke="#e2e8f0" strokeDasharray="3 3" />
                <line x1="20" y1="125" x2="340" y2="125" stroke="#cbd5e1" strokeWidth="1.5" />

                {/* Y-Axis Label */}
                <text x="5" y="25" fill="#94a3b8" fontSize="8" fontWeight="bold">
                  {Math.round(chartMaxY)}k
                </text>
                <text x="5" y="75" fill="#94a3b8" fontSize="8" fontWeight="bold">
                  {Math.round(chartMaxY / 2)}k
                </text>
                <text x="5" y="125" fill="#94a3b8" fontSize="8" fontWeight="bold">
                  0
                </text>

                {/* Expected Line (Dashed) */}
                {chartPoints.expected && (
                  <polyline
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    points={chartPoints.expected}
                  />
                )}

                {/* Actual Line (Solid Gradient Emerald/Amber) */}
                {chartPoints.actual && (
                  <polyline
                    fill="none"
                    stroke="#059669"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={chartPoints.actual}
                  />
                )}

                {/* Data Points on Passed Days */}
                {dailyBreakdown
                  .filter((d) => d.cumActualKg !== null)
                  .map((d, idx) => {
                    const cx = chartPoints.getX ? chartPoints.getX(d.dayNumber) : 20;
                    const cy = chartPoints.getY ? chartPoints.getY(d.cumActualKg) : 100;
                    const isTodayDot = d.isToday;

                    return (
                      <g key={idx}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isTodayDot ? 5 : 3}
                          fill={isTodayDot ? '#f59e0b' : '#059669'}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      </g>
                    );
                  })}
              </svg>
            </div>
          </div>
        )}

        {/* 6. Toggle Date-wise Daily Breakdown Table */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => setShowTable((prev) => !prev)}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-1.5 uppercase">
              <Calendar className="w-4 h-4 text-red-700" />
              <span>View Date-Wise Daily Achievement Breakdown ({dailyBreakdown.length} Days)</span>
            </span>
            {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showTable && (
            <div className="mt-3 space-y-3 animate-in fade-in duration-200">
              {/* Week Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
                {[
                  { key: 'ALL', label: 'All Month' },
                  { key: 'W1', label: 'Week 1 (1-7)' },
                  { key: 'W2', label: 'Week 2 (8-14)' },
                  { key: 'W3', label: 'Week 3 (15-21)' },
                  { key: 'W4', label: 'Week 4 (22-28)' },
                  { key: 'W5', label: 'Week 5 (29-30)' },
                ].map((wf) => (
                  <button
                    key={wf.key}
                    onClick={() => setWeekFilter(wf.key)}
                    className={`px-3 py-1 rounded-lg shrink-0 transition-colors ${
                      weekFilter === wf.key
                        ? 'bg-slate-900 text-amber-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {wf.label}
                  </button>
                ))}
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-extrabold text-[10px]">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Day</th>
                      <th className="p-2.5 text-right">Daily Target</th>
                      <th className="p-2.5 text-right">Achievement</th>
                      <th className="p-2.5 text-right">Difference</th>
                      <th className="p-2.5 text-center">Pace</th>
                      <th className="p-2.5 text-right">Cumulative</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredDailyBreakdown.map((row) => (
                      <tr
                        key={row.dateStr}
                        className={`hover:bg-slate-50 transition-colors ${
                          row.isToday ? 'bg-amber-50/80 font-bold' : ''
                        }`}
                      >
                        <td className="p-2.5 font-bold">
                          {row.displayDate}
                          {row.isToday && (
                            <span className="ml-1.5 px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded text-[9px] font-black uppercase">
                              Today
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-500">{row.dayName}</td>
                        <td className="p-2.5 text-right font-bold">
                          {row.isWorkingDay ? `${row.dailyTarget} KG` : <span className="text-slate-400">Off</span>}
                        </td>
                        <td className="p-2.5 text-right font-black">
                          {row.isPassed ? (
                            <span className={row.actualKg > 0 ? 'text-slate-900' : 'text-slate-400'}>
                              {row.actualKg} KG
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-bold">
                          {row.isPassed && row.isWorkingDay ? (
                            <span className={row.diffKg >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                              {row.diffKg >= 0 ? `+${row.diffKg}` : row.diffKg} KG
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          {row.isPassed && row.isWorkingDay ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                row.paceStatus === 'Ahead'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : row.paceStatus === 'Behind'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {row.paceStatus}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">{row.dayName === 'Sunday' ? 'Sunday' : '—'}</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-black text-slate-900">
                          {row.isPassed ? `${row.cumActualKg} KG` : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
