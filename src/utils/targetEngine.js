/**
 * Patel Sahab Spices — Marketing Management
 * Marketer Monthly Target & Achievement Tracking Engine
 *
 * Core calculations:
 * - Working days detection (Weekly off/Sunday dynamic calculation)
 * - Monthly Target (KG) & Daily Target (KG/day)
 * - Target Till Today (Expected cumulative target up to current elapsed working days)
 * - Actual Achievement (Valid order KG)
 * - Achievement %
 * - Remaining Target (KG) & Target Exceeded By (KG)
 * - Pace Difference % (Actual vs Expected Till Today) & Status (Ahead / On Track / Behind)
 * - Remaining Daily Required Average (KG/day)
 * - Today's Performance (Target vs Actual vs Pace)
 * - Day-by-day Breakdown & Cumulative Target vs Achievement Series
 */

// Month names helper
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Parse date string "DD-MM-YYYY" or "YYYY-MM-DD" into Date object
 */
export const parseDateStr = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts[0].length === 2) {
      // DD-MM-YYYY
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    } else if (parts[0].length === 4) {
      // YYYY-MM-DD
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
  }
  return new Date(dateStr);
};

/**
 * Format Date to "DD-MM-YYYY"
 */
export const formatDateToDDMMYYYY = (d) => {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Format Date to "Month Year", e.g. "September 2026"
 */
export const formatToMonthYear = (d) => {
  const monthName = MONTH_NAMES[d.getMonth()];
  return `${monthName} ${d.getFullYear()}`;
};

/**
 * Parse Month-Year string ("September 2026" or "2026-09" or "09-2026") into { year, monthIndex, monthName, monthKey }
 */
export const parseMonthYear = (monthStr) => {
  if (!monthStr) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      monthIndex: now.getMonth(),
      monthName: MONTH_NAMES[now.getMonth()],
      monthKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      displayMonth: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`,
    };
  }

  // Case 1: "September 2026"
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (monthStr.toLowerCase().includes(MONTH_NAMES[i].toLowerCase())) {
      const parts = monthStr.trim().split(/\s+/);
      const yearStr = parts.find((p) => /^\d{4}$/.test(p)) || '2026';
      const year = parseInt(yearStr, 10);
      return {
        year,
        monthIndex: i,
        monthName: MONTH_NAMES[i],
        monthKey: `${year}-${String(i + 1).padStart(2, '0')}`,
        displayMonth: `${MONTH_NAMES[i]} ${year}`,
      };
    }
  }

  // Case 2: "2026-09"
  if (/^\d{4}-\d{2}$/.test(monthStr)) {
    const [y, m] = monthStr.split('-');
    const monthIndex = parseInt(m, 10) - 1;
    const year = parseInt(y, 10);
    return {
      year,
      monthIndex,
      monthName: MONTH_NAMES[monthIndex] || 'Unknown',
      monthKey: monthStr,
      displayMonth: `${MONTH_NAMES[monthIndex] || 'Month'} ${year}`,
    };
  }

  // Case 3: "09-2026"
  if (/^\d{2}-\d{4}$/.test(monthStr)) {
    const [m, y] = monthStr.split('-');
    const monthIndex = parseInt(m, 10) - 1;
    const year = parseInt(y, 10);
    return {
      year,
      monthIndex,
      monthName: MONTH_NAMES[monthIndex] || 'Unknown',
      monthKey: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      displayMonth: `${MONTH_NAMES[monthIndex] || 'Month'} ${year}`,
    };
  }

  // Fallback to current month
  const now = new Date();
  return {
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
    monthName: MONTH_NAMES[now.getMonth()],
    monthKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    displayMonth: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`,
  };
};

/**
 * Calculate working days in a given month.
 * Does not hardcode 26 days. Computes dynamically by checking days of week
 * and marketer's route active schedule (defaulting to Sunday off).
 */
export const calculateMonthWorkingDays = ({
  year,
  monthIndex,
  marketerId,
  weeklyRoutes = [],
  customWorkingDays = null,
}) => {
  if (customWorkingDays != null && customWorkingDays > 0) {
    return {
      totalDaysInMonth: new Date(year, monthIndex + 1, 0).getDate(),
      totalWorkingDays: Number(customWorkingDays),
      workingDaysList: [],
    };
  }

  const totalDaysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const workingDaysList = [];
  const daysOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Check if marketer has specific active weekly route days
  const marketerRoutes = weeklyRoutes.filter((r) => r.marketerId === marketerId && r.active !== false);
  const activeDayNames = new Set(marketerRoutes.map((r) => r.day?.toLowerCase()));

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    const dayOfWeek = d.getDay(); // 0 = Sunday
    const dayName = daysOfWeekNames[dayOfWeek];
    const dateStr = formatDateToDDMMYYYY(d);

    // If marketer has explicit weekly routes, check if this day is scheduled; otherwise default Mon-Sat (non-Sunday)
    let isWorking = false;
    if (activeDayNames.size > 0) {
      isWorking = activeDayNames.has(dayName.toLowerCase());
    } else {
      isWorking = dayOfWeek !== 0; // Monday-Saturday
    }

    if (isWorking) {
      workingDaysList.push({
        dayNumber: day,
        dateStr,
        dayName,
        dateObj: d,
      });
    }
  }

  return {
    totalDaysInMonth,
    totalWorkingDays: workingDaysList.length > 0 ? workingDaysList.length : 26,
    workingDaysList,
  };
};

/**
 * Main Target & Achievement Calculator
 */
export const calculateMarketerMonthlyMetrics = ({
  marketerId,
  marketerName = 'Marketer',
  monthStr, // e.g. "September 2026" or "2026-09"
  targets = [],
  orders = [],
  returns = [],
  weeklyRoutes = [],
  todayDateStr = formatDateToDDMMYYYY(new Date()),
  paceThreshold = 5, // ±5% is On Track
}) => {
  const monthInfo = parseMonthYear(monthStr);
  const { year, monthIndex, monthKey, displayMonth } = monthInfo;

  // 1. Find the target configuration for this marketer and this month
  const targetRecord = targets.find((t) => {
    if (t.marketerId !== marketerId) return false;
    if (t.monthKey === monthKey) return true;
    if (t.month && t.month.toLowerCase() === displayMonth.toLowerCase()) return true;
    // Check start and end date overlap
    if (t.startDate && t.endDate) {
      const sDate = parseDateStr(t.startDate);
      const eDate = parseDateStr(t.endDate);
      const targetMonthDate = new Date(year, monthIndex, 15);
      return targetMonthDate >= sDate && targetMonthDate <= eDate;
    }
    return false;
  }) || targets.find((t) => t.marketerId === marketerId && t.active !== false) || null;

  // Monthly Target KG
  const monthlyTargetKg = targetRecord?.monthlyKg || 3380;
  const targetHistory = targetRecord?.targetHistory || [];

  // 2. Working days in month calculation
  const { totalDaysInMonth, totalWorkingDays, workingDaysList } = calculateMonthWorkingDays({
    year,
    monthIndex,
    marketerId,
    weeklyRoutes,
    customWorkingDays: targetRecord?.workingDays || null,
  });

  // Daily Target = Monthly Target ÷ Working Days
  const dailyTargetKg = totalWorkingDays > 0 ? Math.round((monthlyTargetKg / totalWorkingDays) * 10) / 10 : 130;

  // 3. Elapsed working days up to today
  const todayDateObj = parseDateStr(todayDateStr);
  const isCurrentMonth = todayDateObj.getFullYear() === year && todayDateObj.getMonth() === monthIndex;
  const isPastMonth = (todayDateObj.getFullYear() > year) || (todayDateObj.getFullYear() === year && todayDateObj.getMonth() > monthIndex);
  const isFutureMonth = (todayDateObj.getFullYear() < year) || (todayDateObj.getFullYear() === year && todayDateObj.getMonth() < monthIndex);

  let elapsedWorkingDays = 0;
  if (isPastMonth) {
    elapsedWorkingDays = totalWorkingDays;
  } else if (isFutureMonth) {
    elapsedWorkingDays = 0;
  } else {
    // Current month: count working days from 1st of month up to today's date
    const currentDayNum = todayDateObj.getDate();
    if (workingDaysList.length > 0) {
      elapsedWorkingDays = workingDaysList.filter((wd) => wd.dayNumber <= currentDayNum).length;
    } else {
      // Approximate if no list
      const ratio = Math.min(1, currentDayNum / totalDaysInMonth);
      elapsedWorkingDays = Math.max(1, Math.round(ratio * totalWorkingDays));
    }
  }

  // Target Till Today (Expected Cumulative Target) = Daily Target × Elapsed Working Days
  const expectedTargetTillToday = Math.round(dailyTargetKg * elapsedWorkingDays);

  // 4. Actual Achievement from valid orders in this month
  const marketerOrders = orders.filter((o) => {
    if (o.marketerId !== marketerId) return false;
    if (o.status === 'Cancelled' || o.status === 'Deleted') return false;
    const od = parseDateStr(o.date || o.createdDate);
    return od.getFullYear() === year && od.getMonth() === monthIndex;
  });

  const marketerReturns = returns.filter((r) => {
    if (r.marketerId !== marketerId) return false;
    const rd = parseDateStr(r.date || r.createdDate);
    return rd.getFullYear() === year && rd.getMonth() === monthIndex;
  });

  const totalGrossOrderKg = marketerOrders.reduce((sum, o) => sum + (Number(o.totalKg) || 0), 0);
  const totalReturnKg = marketerReturns.reduce((sum, r) => sum + (Number(r.returnKg ?? r.quantity ?? 0) || 0), 0);

  // Actual Achievement is gross sales order KG (or net order KG if needed)
  const actualAchievementKg = Math.round(totalGrossOrderKg);

  // 5. Achievement % = (Actual Achievement ÷ Monthly Target) × 100
  const achievementPct = monthlyTargetKg > 0
    ? Math.round((actualAchievementKg / monthlyTargetKg) * 1000) / 10
    : 0;

  // 6. Remaining Target = Monthly Target - Actual Achievement
  const remainingTargetKg = Math.max(0, Math.round(monthlyTargetKg - actualAchievementKg));
  const exceededByKg = Math.max(0, Math.round(actualAchievementKg - monthlyTargetKg));
  const isTargetAchieved = actualAchievementKg >= monthlyTargetKg;

  // 7. Pace / Ahead-Behind Calculation (Compare Actual vs Expected Till Today)
  const paceDiffKg = Math.round(actualAchievementKg - expectedTargetTillToday);
  let paceDiffPct = 0;
  if (expectedTargetTillToday > 0) {
    paceDiffPct = Math.round(((actualAchievementKg - expectedTargetTillToday) / expectedTargetTillToday) * 1000) / 10;
  } else if (actualAchievementKg > 0) {
    paceDiffPct = 100;
  }

  let paceStatus = 'ON_TRACK'; // 'AHEAD' | 'ON_TRACK' | 'BEHIND'
  let paceLabel = 'On Track';

  if (paceDiffPct > paceThreshold) {
    paceStatus = 'AHEAD';
    paceLabel = `${Math.abs(paceDiffPct).toFixed(1)}% Ahead of Target Pace`;
  } else if (paceDiffPct < -paceThreshold) {
    paceStatus = 'BEHIND';
    paceLabel = `${Math.abs(paceDiffPct).toFixed(1)}% Behind Target Pace`;
  } else {
    paceStatus = 'ON_TRACK';
    paceLabel = `On Track (${paceDiffPct >= 0 ? '+' : ''}${paceDiffPct.toFixed(1)}%)`;
  }

  // 8. Remaining Daily Required Average (Run-Rate)
  const remainingWorkingDays = Math.max(0, totalWorkingDays - elapsedWorkingDays);
  let requiredDailyRunRate = 0;
  if (remainingTargetKg > 0) {
    const divisor = remainingWorkingDays > 0 ? remainingWorkingDays : 1;
    requiredDailyRunRate = Math.round((remainingTargetKg / divisor) * 10) / 10;
  }

  // 9. Today's Performance (Target vs Actual for today's date)
  const todayOrders = orders.filter((o) => {
    if (o.marketerId !== marketerId) return false;
    if (o.status === 'Cancelled' || o.status === 'Deleted') return false;
    const dStr = o.date || o.createdDate;
    return dStr === todayDateStr;
  });
  const todayAchievementKg = todayOrders.reduce((sum, o) => sum + (Number(o.totalKg) || 0), 0);
  const todayTargetKg = dailyTargetKg;
  const todayDiffKg = Math.round((todayAchievementKg - todayTargetKg) * 10) / 10;
  const todayDiffPct = todayTargetKg > 0
    ? Math.round(((todayAchievementKg - todayTargetKg) / todayTargetKg) * 1000) / 10
    : 0;

  let todayStatus = 'ON_TRACK';
  if (todayDiffPct > paceThreshold) {
    todayStatus = 'ABOVE';
  } else if (todayDiffPct < -paceThreshold) {
    todayStatus = 'BELOW';
  }

  // 10. Date-wise Daily Breakdown & Cumulative Series
  const daysInMonth = totalDaysInMonth;
  const dailyBreakdown = [];
  const cumChartData = [];

  let runningExpectedKg = 0;
  let runningActualKg = 0;
  let workingDaysCountSoFar = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    const dStr = formatDateToDDMMYYYY(d);
    const dayOfWeek = d.getDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
    
    // Check if working day
    const isWorkingDay = workingDaysList.some((wd) => wd.dayNumber === day) || (workingDaysList.length === 0 && dayOfWeek !== 0);
    
    if (isWorkingDay) {
      workingDaysCountSoFar += 1;
      runningExpectedKg = Math.round(workingDaysCountSoFar * dailyTargetKg);
    }

    // Orders on this specific day
    const dayOrders = orders.filter((o) => {
      if (o.marketerId !== marketerId) return false;
      if (o.status === 'Cancelled' || o.status === 'Deleted') return false;
      return (o.date === dStr || o.createdDate === dStr);
    });

    const dayActualKg = dayOrders.reduce((sum, o) => sum + (Number(o.totalKg) || 0), 0);
    runningActualKg += dayActualKg;

    const dayTarget = isWorkingDay ? dailyTargetKg : 0;
    const dayDiff = isWorkingDay ? Math.round(dayActualKg - dayTarget) : dayActualKg;
    
    let dayPace = 'Rest Day';
    if (isWorkingDay) {
      if (dayActualKg > dayTarget * 1.05) dayPace = 'Ahead';
      else if (dayActualKg < dayTarget * 0.95) dayPace = 'Behind';
      else dayPace = 'On Track';
    }

    const isDayPassed = isPastMonth || (isCurrentMonth && day <= todayDateObj.getDate());

    const item = {
      dayNumber: day,
      dateStr: dStr,
      displayDate: `${String(day).padStart(2, '0')} ${monthInfo.monthName.slice(0, 3)}`,
      dayName,
      isWorkingDay,
      dailyTarget: dayTarget,
      actualKg: dayActualKg,
      diffKg: dayDiff,
      paceStatus: dayPace,
      cumExpectedKg: runningExpectedKg,
      cumActualKg: isDayPassed ? runningActualKg : null,
      isPassed: isDayPassed,
      isToday: isCurrentMonth && day === todayDateObj.getDate(),
    };

    dailyBreakdown.push(item);
    if (isDayPassed || day <= (isCurrentMonth ? todayDateObj.getDate() + 5 : 15)) {
      cumChartData.push(item);
    }
  }

  return {
    marketerId,
    marketerName,
    month: displayMonth,
    monthKey,
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
    targetHistory,
    targetRecord,
    dailyBreakdown,
    cumChartData,
    totalOrdersCount: marketerOrders.length,
    totalReturnsKg: totalReturnKg,
  };
};
