import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../../context/DataContext';
import {
  Navigation,
  Clock,
  MapPin,
  Store,
  CheckCircle2,
  AlertTriangle,
  Users,
  Search,
  RefreshCw,
  Eye,
  FileText,
  Map as MapIcon,
  Phone,
  Shield,
  ShoppingBag,
  IndianRupee,
  RotateCcw,
  Activity,
  Layers,
  Crosshair,
  Compass,
  Maximize2,
  X,
  Calendar,
  ChevronRight,
  Battery,
  AlertCircle,
  Radio,
} from 'lucide-react';
import L from 'leaflet';

// Fix Leaflet Default Icon issue in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper: Calculate relative time (e.g., "2m ago", "1h ago")
const getRelativeTime = (isoStringOrTimestamp) => {
  if (!isoStringOrTimestamp) return 'Never';
  const time = typeof isoStringOrTimestamp === 'number'
    ? isoStringOrTimestamp
    : new Date(isoStringOrTimestamp).getTime();
  if (isNaN(time)) return 'Never';
  const now = Date.now();
  const diffSec = Math.floor((now - time) / 1000);

  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
};

// Helper: Format duration
const formatDuration = (startTime, endTime) => {
  if (!startTime) return '—';
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
    const eMin = endTime ? parseTime(endTime) : (() => {
      const now = new Date();
      return now.getHours() * 60 + now.getMinutes();
    })();
    if (sMin == null || eMin == null || eMin < sMin) return '—';
    const diff = eMin - sMin;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hrs}h ${mins}m`;
  } catch {
    return '—';
  }
};

export default function LiveTracking() {
  const {
    marketers = [],
    markets = [],
    shops = [],
    orders = [],
    collections = [],
    returns = [],
    visits = [],
    checkIns = [],
    liveLocations = {},
    getFormattedDate,
    getFormattedTime,
    getTodayMarket,
  } = useData();

  const todayDate = getFormattedDate();

  // Filters State
  const [selectedMdoId, setSelectedMdoId] = useState('ALL');
  const [selectedMarketId, setSelectedMarketId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'SHOP_VISIT' | 'ISSUES' | 'ENDED'
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());

  // Modals state
  const [detailMarketer, setDetailMarketer] = useState(null);
  const [historyMarketer, setHistoryMarketer] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [activeTimelineMarketer, setActiveTimelineMarketer] = useState(null);

  // Map DOM and Instance refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerGroupRef = useRef(null);
  const routeMapContainerRef = useRef(null);
  const routeMapInstanceRef = useRef(null);

  // Manual refresh trigger
  const handleRefresh = () => {
    setLastRefreshedAt(new Date());
  };

  // Compile Comprehensive Real-Time Marketer Records
  const marketerTrackingList = useMemo(() => {
    const now = Date.now();

    return marketers.map((m) => {
      const todayMarket = getTodayMarket(m.id, todayDate);
      const chk = checkIns.find(
        (c) => c.marketerId === m.id && (c.date === todayDate || c.createdDate === todayDate)
      );
      const liveLoc = liveLocations[m.id] || {};

      // Day Session Lifecycle
      const isDayStarted = Boolean(chk);
      const isDayActive = Boolean(chk && chk.status === 'ACTIVE' && !chk.endTime && !chk.isDayEnded);
      const isDayEnded = Boolean(chk && (chk.status === 'INACTIVE' || chk.endTime || chk.isDayEnded));

      // Today's Activity Records
      const mVisits = visits.filter(
        (v) => v.marketerId === m.id && (v.date === todayDate || v.createdDate === todayDate)
      );
      const mOrders = orders.filter(
        (o) => o.marketerId === m.id && (o.date === todayDate || o.createdDate === todayDate)
      );
      const mCollections = collections.filter(
        (c) => c.marketerId === m.id && (c.date === todayDate || c.createdDate === todayDate)
      );
      const mReturns = returns.filter(
        (r) => r.marketerId === m.id && (r.date === todayDate || r.createdDate === todayDate)
      );

      // Latest Activity Resolution
      let lastActivityText = 'No activity logged yet';
      let lastActivityTime = '—';
      const allEvents = [
        ...mVisits.map((v) => ({ time: v.time, desc: `Visited ${v.shopName || 'Shop'}` })),
        ...mOrders.map((o) => ({ time: o.time, desc: `Order #${o.id?.slice(-4) || ''} (${o.totalKg || 0} KG)` })),
        ...mCollections.map((c) => ({ time: c.time, desc: `Collection ₹${Number(c.amount || 0).toLocaleString('en-IN')}` })),
        ...mReturns.map((r) => ({ time: r.time, desc: `Return ₹${Number(r.returnValue || 0).toLocaleString('en-IN')}` })),
      ];
      if (allEvents.length > 0) {
        const lastEvt = allEvents[allEvents.length - 1];
        lastActivityText = lastEvt.desc;
        lastActivityTime = lastEvt.time;
      }

      // Location Details
      const lat = liveLoc.latitude ?? (chk?.gpsLocation?.lat || null);
      const lng = liveLoc.longitude ?? (chk?.gpsLocation?.lng || null);
      const accuracy = liveLoc.accuracy ?? (chk?.gpsLocation?.accuracy || null);
      const hasValidCoords = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
      const permissionState = liveLoc.locationPermission || (chk?.gpsLocation?.permission || 'prompt');

      // Stale Calculation (> 15 minutes without update during active session)
      const lastUpdateTimestamp = liveLoc.timestamp || (liveLoc.lastUpdatedAt ? new Date(liveLoc.lastUpdatedAt).getTime() : 0);
      const isLocationStale = isDayActive && hasValidCoords && (now - lastUpdateTimestamp > 15 * 60 * 1000);
      const isPermissionDenied = permissionState === 'denied' || liveLoc.error?.includes('denied');
      const isLocationUnavailable = isDayActive && !hasValidCoords && !isPermissionDenied;

      // Current Status calculation based on actual events
      let status = 'Offline';
      let statusBadgeClass = 'bg-slate-100 text-slate-600 border-slate-300';
      let statusDotClass = 'bg-slate-400';

      if (isDayActive) {
        if (liveLoc.status === 'On Shop Visit' || liveLoc.shopName) {
          status = 'On Shop Visit';
          statusBadgeClass = 'bg-blue-50 text-blue-800 border-blue-300';
          statusDotClass = 'bg-blue-600 animate-pulse';
        } else if (liveLoc.status === 'Taking Order') {
          status = 'Taking Order';
          statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
          statusDotClass = 'bg-amber-500 animate-pulse';
        } else if (liveLoc.status === 'Collecting Payment') {
          status = 'Collecting Payment';
          statusBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
          statusDotClass = 'bg-emerald-500 animate-pulse';
        } else if (liveLoc.status === 'Recording Return') {
          status = 'Recording Return';
          statusBadgeClass = 'bg-red-50 text-red-800 border-red-300';
          statusDotClass = 'bg-red-500 animate-pulse';
        } else if (isLocationStale) {
          status = 'Location Stale';
          statusBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
          statusDotClass = 'bg-amber-600';
        } else if (isPermissionDenied) {
          status = 'Permission Denied';
          statusBadgeClass = 'bg-rose-50 text-rose-800 border-rose-300';
          statusDotClass = 'bg-rose-500';
        } else if (isLocationUnavailable) {
          status = 'Location Unavailable';
          statusBadgeClass = 'bg-orange-50 text-orange-800 border-orange-300';
          statusDotClass = 'bg-orange-500';
        } else {
          status = 'On Market Visit';
          statusBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
          statusDotClass = 'bg-emerald-500 animate-pulse';
        }
      } else if (isDayEnded) {
        status = 'Day Ended';
        statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
        statusDotClass = 'bg-slate-500';
      } else {
        status = 'Not Started';
        statusBadgeClass = 'bg-slate-100 text-slate-400 border-slate-200';
        statusDotClass = 'bg-slate-300';
      }

      // Timing
      const startTime = chk?.startTime || chk?.createdTime || '—';
      const endTime = isDayEnded ? (chk.endTime || 'Day Ended') : '—';
      const workingHours = isDayStarted ? formatDuration(startTime, isDayEnded ? chk.endTime : null) : '—';

      // Totals
      const totalOrderKg = mOrders.reduce((s, o) => s + Number(o.totalKg || 0), 0);
      const totalOrderValue = mOrders.reduce((s, o) => s + Number(o.grandTotal || o.totalValue || 0), 0);
      const totalCollectionValue = mCollections.reduce((s, c) => s + Number(c.amount || 0), 0);
      const totalReturnValue = mReturns.reduce((s, r) => s + Number(r.returnValue || 0), 0);

      return {
        id: m.id,
        name: m.name,
        mobile: m.mobile || '—',
        role: m.role || 'MDO',
        assignedMarketName: todayMarket?.marketName || m.assignedMarketName || 'Pachore',
        assignedMarketId: todayMarket?.marketId || m.assignedMarketId,
        routeType: todayMarket?.routeType || 'Normal Fixed Route',
        status,
        statusBadgeClass,
        statusDotClass,
        isDayStarted,
        isDayActive,
        isDayEnded,
        startTime,
        endTime,
        workingHours,
        lat,
        lng,
        accuracy,
        hasValidCoords,
        lastUpdatedAt: liveLoc.lastUpdatedAt || chk?.updatedTime || null,
        relativeUpdateTime: getRelativeTime(lastUpdateTimestamp),
        isLocationStale,
        isPermissionDenied,
        isLocationUnavailable,
        batteryLevel: liveLoc.batteryLevel ?? null,
        currentShopName: liveLoc.shopName || (mVisits[mVisits.length - 1]?.shopName) || null,
        lastActivityText,
        lastActivityTime,
        visitsCount: mVisits.length,
        ordersCount: mOrders.length,
        totalOrderKg,
        totalOrderValue,
        totalCollectionValue,
        totalReturnValue,
        rawCheckIn: chk,
        rawLiveLoc: liveLoc,
        mVisits,
        mOrders,
        mCollections,
        mReturns,
      };
    });
  }, [marketers, markets, checkIns, liveLocations, visits, orders, collections, returns, todayDate, lastRefreshedAt]);

  // Executive Top Summary KPI Counts
  const summaryKpis = useMemo(() => {
    const totalMarketers = marketerTrackingList.length;
    const activeNow = marketerTrackingList.filter((m) => m.isDayActive).length;
    const onMarketVisit = marketerTrackingList.filter((m) => m.status === 'On Market Visit').length;
    const onShopVisit = marketerTrackingList.filter((m) => m.status === 'On Shop Visit').length;
    const takingOrder = marketerTrackingList.filter((m) => m.status === 'Taking Order').length;
    const collectingPayment = marketerTrackingList.filter((m) => m.status === 'Collecting Payment').length;
    const dayStarted = marketerTrackingList.filter((m) => m.isDayStarted).length;
    const dayEnded = marketerTrackingList.filter((m) => m.isDayEnded).length;
    const locationIssues = marketerTrackingList.filter(
      (m) => m.isLocationStale || m.isPermissionDenied || m.isLocationUnavailable
    ).length;

    return {
      totalMarketers,
      activeNow,
      onMarketVisit,
      onShopVisit,
      takingOrder,
      collectingPayment,
      dayStarted,
      dayEnded,
      locationIssues,
    };
  }, [marketerTrackingList]);

  // Filtered Marketers List for Map and Table
  const filteredMarketers = useMemo(() => {
    return marketerTrackingList.filter((m) => {
      if (selectedMdoId !== 'ALL' && m.id !== selectedMdoId) return false;
      if (selectedMarketId !== 'ALL' && m.assignedMarketId !== selectedMarketId) return false;

      if (statusFilter === 'ACTIVE' && !m.isDayActive) return false;
      if (statusFilter === 'SHOP_VISIT' && m.status !== 'On Shop Visit') return false;
      if (statusFilter === 'ISSUES' && !(m.isLocationStale || m.isPermissionDenied || m.isLocationUnavailable)) return false;
      if (statusFilter === 'ENDED' && !m.isDayEnded) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = m.name.toLowerCase().includes(q);
        const matchMarket = m.assignedMarketName.toLowerCase().includes(q);
        const matchShop = m.currentShopName?.toLowerCase().includes(q);
        const matchStatus = m.status.toLowerCase().includes(q);
        if (!matchName && !matchMarket && !matchShop && !matchStatus) return false;
      }

      return true;
    });
  }, [marketerTrackingList, selectedMdoId, selectedMarketId, statusFilter, searchQuery]);

  // Marketers with valid GPS coordinates to plot on Map
  const mapMarketers = useMemo(() => {
    return filteredMarketers.filter((m) => m.hasValidCoords);
  }, [filteredMarketers]);

  // Marketers without GPS coordinates (Denied or Unavailable)
  const noGpsMarketers = useMemo(() => {
    return filteredMarketers.filter((m) => !m.hasValidCoords && m.isDayActive);
  }, [filteredMarketers]);

  // Initialize and update Main Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Map instance if not created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [23.7021, 76.7112], // Central Pachore HQ
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersLayer = L.featureGroup().addTo(map);
      markersLayerGroupRef.current = markersLayer;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerGroupRef.current;
    markersLayer.clearLayers();

    // Render Markers for all MDOs with actual coordinates
    mapMarketers.forEach((m) => {
      // Determine marker color and icon
      let pinColor = '#10b981'; // Emerald (Active)
      let pulseRing = true;

      if (m.status === 'On Shop Visit') {
        pinColor = '#3b82f6'; // Blue
      } else if (m.status === 'Taking Order' || m.status === 'Collecting Payment') {
        pinColor = '#f59e0b'; // Amber
      } else if (m.isLocationStale) {
        pinColor = '#ef4444'; // Red
        pulseRing = false;
      } else if (m.isDayEnded) {
        pinColor = '#64748b'; // Slate
        pulseRing = false;
      }

      // Custom HTML Marker Icon
      const customIconHtml = `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          ${
            pulseRing
              ? `<div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: ${pinColor}; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : ''
          }
          <div style="position: relative; width: 30px; height: 30px; border-radius: 50%; background-color: ${pinColor}; border: 2.5px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 11px;">
            ${m.name.charAt(0).toUpperCase()}
          </div>
        </div>
      `;

      const markerIcon = L.divIcon({
        html: customIconHtml,
        className: 'custom-leaflet-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
      });

      const marker = L.marker([m.lat, m.lng], { icon: markerIcon });

      // Popup Content
      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; min-width: 220px; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
            <div>
              <strong style="font-size: 14px; color: #0f172a; display: block;">${m.name}</strong>
              <span style="font-size: 11px; color: #64748b;">${m.role} • ${m.mobile}</span>
            </div>
          </div>
          <div style="font-size: 11px; line-height: 1.5; color: #334155; space-y: 3px;">
            <div><strong>Status:</strong> <span style="font-weight: 800; color: ${pinColor};">${m.status}</span></div>
            <div><strong>Market:</strong> ${m.assignedMarketName}</div>
            ${m.currentShopName ? `<div><strong>Shop:</strong> ${m.currentShopName}</div>` : ''}
            <div><strong>Last Update:</strong> ${m.relativeUpdateTime}</div>
            <div><strong>Accuracy:</strong> ±${m.accuracy || 10}m</div>
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between;">
              <span><strong>Orders:</strong> ${m.ordersCount} (${m.totalOrderKg} KG)</span>
              <span><strong>Coll:</strong> ₹${m.totalCollectionValue.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      markersLayer.addLayer(marker);
    });

    // Auto-fit bounds to show all active markers
    if (mapMarketers.length > 0) {
      const bounds = markersLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }
  }, [mapMarketers]);

  // Center map on HQ / Pachore
  const handleCenterPachore = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([23.7021, 76.7112], 13);
    }
  };

  // Fit all markers
  const handleFitAllMarkers = () => {
    if (mapInstanceRef.current && markersLayerGroupRef.current) {
      const bounds = markersLayerGroupRef.current.getBounds();
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } else {
        handleCenterPachore();
      }
    }
  };

  // Open Location Route History Modal for a Marketer
  const handleOpenRouteHistory = async (marketer) => {
    setHistoryMarketer(marketer);
    const dateStr = todayDate;
    const docId = `${marketer.id}_${dateStr}`;
    const localKey = `PATEL_LOCATION_HISTORY_${docId}`;

    let historyDoc = null;
    try {
      const s = localStorage.getItem(localKey);
      if (s) historyDoc = JSON.parse(s);
    } catch {}

    setHistoryData(historyDoc);
  };

  // Render Route Breadcrumb Map inside History Modal
  useEffect(() => {
    if (!historyMarketer || !routeMapContainerRef.current) return;

    if (routeMapInstanceRef.current) {
      routeMapInstanceRef.current.remove();
      routeMapInstanceRef.current = null;
    }

    const points = historyData?.points || [];
    const validPoints = points.filter((p) => p.lat && p.lng);

    const initialCenter = validPoints.length > 0
      ? [validPoints[0].lat, validPoints[0].lng]
      : [historyMarketer.lat || 23.7021, historyMarketer.lng || 76.7112];

    const routeMap = L.map(routeMapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(routeMap);

    if (validPoints.length > 0) {
      const latLngs = validPoints.map((p) => [p.lat, p.lng]);

      // Draw polyline connecting breadcrumb points
      L.polyline(latLngs, {
        color: '#dc2626',
        weight: 4,
        opacity: 0.8,
        dashArray: '6, 8',
      }).addTo(routeMap);

      // Add start, intermediate, and latest markers
      validPoints.forEach((p, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === validPoints.length - 1;
        const color = isFirst ? '#10b981' : isLast ? '#dc2626' : '#3b82f6';
        const label = isFirst ? 'START' : isLast ? 'NOW' : `${idx + 1}`;

        const iconHtml = `
          <div style="background-color: ${color}; color: white; border: 2px solid white; border-radius: 12px; padding: 2px 6px; font-size: 10px; font-weight: 900; box-shadow: 0 2px 4px rgba(0,0,0,0.3); text-align: center; white-space: nowrap;">
            ${label}
          </div>
        `;

        const icon = L.divIcon({
          html: iconHtml,
          className: 'history-waypoint-marker',
          iconSize: [40, 20],
          iconAnchor: [20, 10],
        });

        const m = L.marker([p.lat, p.lng], { icon }).addTo(routeMap);
        m.bindPopup(`
          <div style="font-size: 11px; font-family: system-ui;">
            <strong>${p.activity || 'Field Location'}</strong><br/>
            ${p.shopName ? `Shop: ${p.shopName}<br/>` : ''}
            Time: ${p.time || '—'}<br/>
            Accuracy: ±${p.accuracy || 10}m
          </div>
        `);
      });

      routeMap.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
    }

    routeMapInstanceRef.current = routeMap;

    return () => {
      if (routeMapInstanceRef.current) {
        routeMapInstanceRef.current.remove();
        routeMapInstanceRef.current = null;
      }
    };
  }, [historyMarketer, historyData]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-red-100 text-red-900 rounded-full text-[10px] font-black uppercase tracking-wider">
              Patel Sahab Spices
            </span>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
              Live GPS Tracking System
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight mt-1">
            MDO LIVE FIELD TRACKING
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Real-time GPS coordinates, shop visit activity, orders, and field officer positions
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleRefresh}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* TOP REAL-TIME SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        {/* Total Marketers */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total MDOs</span>
          <p className="text-2xl font-black text-slate-900">{summaryKpis.totalMarketers}</p>
          <p className="text-[10px] font-bold text-slate-500">Registered Field Force</p>
        </div>

        {/* Active Now */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Now</span>
          <p className="text-2xl font-black text-emerald-700">{summaryKpis.activeNow}</p>
          <p className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>In Field Today</span>
          </p>
        </div>

        {/* On Shop Visit */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">On Shop Visit</span>
          <p className="text-2xl font-black text-blue-900">{summaryKpis.onShopVisit}</p>
          <p className="text-[10px] font-bold text-blue-700">Currently in Shop</p>
        </div>

        {/* Order / Collection Activity */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Transactions</span>
          <p className="text-2xl font-black text-amber-900">{summaryKpis.takingOrder + summaryKpis.collectingPayment}</p>
          <p className="text-[10px] font-bold text-amber-700">Taking Orders / Coll</p>
        </div>

        {/* Day Ended */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Day Ended</span>
          <p className="text-2xl font-black text-slate-700">{summaryKpis.dayEnded}</p>
          <p className="text-[10px] font-bold text-slate-500">Completed Checkout</p>
        </div>

        {/* Location Issues */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Location Issues</span>
          <p className={`text-2xl font-black ${summaryKpis.locationIssues > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {summaryKpis.locationIssues}
          </p>
          <p className="text-[10px] font-bold text-rose-700">Stale / Denied / Off</p>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-bold">
          {/* MDO Selector */}
          <div>
            <label className="text-slate-500 uppercase block mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-red-600" />
              <span>Select MDO</span>
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
              <span>Select Territory</span>
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

          {/* Status Quick Filter */}
          <div>
            <label className="text-slate-500 uppercase block mb-1 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span>Status Filter</span>
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-red-600 font-extrabold"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">🟢 Active Now</option>
              <option value="SHOP_VISIT">🔵 On Shop Visit</option>
              <option value="ISSUES">⚠️ Location Issues (Stale/Denied)</option>
              <option value="ENDED">⚪ Day Ended</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="text-slate-500 uppercase block mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-purple-600" />
              <span>Search Field Force</span>
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search MDO, market, shop..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
        </div>

        {/* Live Status Bar */}
        <div className="flex flex-wrap justify-between items-center bg-slate-900 text-amber-300 px-4 py-2.5 rounded-2xl text-xs font-extrabold gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Live Feed Status: {todayDate}</span>
            <span className="text-slate-400 text-[11px] font-medium">
              ({mapMarketers.length} Plotted on GPS Map • {filteredMarketers.length} Officers Matching Filters)
            </span>
          </div>
          <div className="text-[11px] text-slate-300 font-semibold">
            Last Updated: {lastRefreshedAt.toLocaleTimeString('en-IN')}
          </div>
        </div>
      </div>

      {/* INTERACTIVE LEAFLET LIVE MAP CONTAINER */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-red-600" />
            <h2 className="text-base font-black text-slate-900 uppercase">
              LIVE SATELLITE & GPS MAP VIEW
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleFitAllMarkers}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-extrabold text-xs flex items-center gap-1.5 border border-slate-200 transition-all"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Fit All MDOs</span>
            </button>
            <button
              onClick={handleCenterPachore}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 rounded-xl font-extrabold text-xs flex items-center gap-1.5 border border-red-200 transition-all"
            >
              <Crosshair className="w-3.5 h-3.5 text-red-600" />
              <span>Center HQ</span>
            </button>
          </div>
        </div>

        {/* Map View Canvas */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner h-[440px] z-0">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* Map Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs font-bold text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span>Active / Market Visit</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span>On Shop Visit</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span>Order / Collection</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span>Location Stale (&gt;15m)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-400"></span>
              <span>Day Ended / Inactive</span>
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            * GPS updates sync every 30-60s on movement. Background tracking subject to mobile browser settings.
          </div>
        </div>
      </div>

      {/* NO GPS / PERMISSION DENIED NOTICE PANEL */}
      {noGpsMarketers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-black">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Active Marketers with GPS Unavailable or Permission Denied ({noGpsMarketers.length})</span>
          </div>
          <p className="text-amber-800 text-[11px]">
            These marketers have started their day but their device GPS coordinates are currently unavailable or permission was not granted:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {noGpsMarketers.map((m) => (
              <span
                key={m.id}
                className="bg-white border border-amber-300 text-amber-900 px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <span>{m.name}</span>
                <span className="text-[10px] text-red-600 uppercase font-black">
                  ({m.isPermissionDenied ? 'Permission Denied' : 'GPS Off/Pending'})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* DETAILED MARKETER LIST & TABLE VIEW */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
            <Users className="w-5 h-5 text-red-600" />
            <span>MDO Field Roster & Real-Time Performance</span>
          </h2>
          <span className="text-xs font-extrabold text-slate-500">
            Showing {filteredMarketers.length} Officers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black border-b border-slate-200">
              <tr>
                <th className="p-3.5">MDO Name</th>
                <th className="p-3.5">Assigned Market</th>
                <th className="p-3.5">Live Status</th>
                <th className="p-3.5">Start Time / Duration</th>
                <th className="p-3.5">Current Shop</th>
                <th className="p-3.5">Last Activity</th>
                <th className="p-3.5">GPS Location</th>
                <th className="p-3.5">Orders Today</th>
                <th className="p-3.5">Collections (₹)</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredMarketers.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-slate-400 font-bold">
                    No marketers found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredMarketers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name & Phone */}
                    <td className="p-3.5">
                      <div className="font-extrabold text-slate-900">{m.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-amber-600" />
                        <a href={`tel:${m.mobile}`} className="hover:underline text-blue-700">
                          {m.mobile}
                        </a>
                      </div>
                    </td>

                    {/* Market */}
                    <td className="p-3.5">
                      <div className="font-bold text-amber-950 uppercase">{m.assignedMarketName}</div>
                      <div className="text-[10px] text-slate-400">{m.routeType}</div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border ${m.statusBadgeClass}`}>
                        <span className={`w-2 h-2 rounded-full ${m.statusDotClass}`} />
                        <span>{m.status}</span>
                      </span>
                    </td>

                    {/* Timing */}
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">{m.startTime}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{m.workingHours}</div>
                    </td>

                    {/* Current Shop */}
                    <td className="p-3.5">
                      {m.currentShopName ? (
                        <div className="font-extrabold text-blue-900 flex items-center gap-1">
                          <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate max-w-[120px]">{m.currentShopName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Last Activity */}
                    <td className="p-3.5">
                      <div className="text-slate-800 font-bold truncate max-w-[140px]">{m.lastActivityText}</div>
                      <div className="text-[10px] text-slate-400">{m.lastActivityTime}</div>
                    </td>

                    {/* GPS Location */}
                    <td className="p-3.5">
                      {m.hasValidCoords ? (
                        <div>
                          <div className="font-bold text-emerald-800 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Verified GPS (±{m.accuracy}m)</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{m.relativeUpdateTime}</div>
                        </div>
                      ) : m.isPermissionDenied ? (
                        <span className="text-rose-600 font-bold text-[11px]">Permission Denied</span>
                      ) : (
                        <span className="text-slate-400 font-medium">Not Available</span>
                      )}
                    </td>

                    {/* Orders Today */}
                    <td className="p-3.5">
                      <div className="font-extrabold text-slate-900">{m.totalOrderKg} KG</div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        {m.ordersCount} orders • ₹{m.totalOrderValue.toLocaleString('en-IN')}
                      </div>
                    </td>

                    {/* Collections Today */}
                    <td className="p-3.5">
                      <div className="font-extrabold text-emerald-700">₹{m.totalCollectionValue.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{m.mCollections.length} receipts</div>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setDetailMarketer(m)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                          title="View Marketer Details & Timeline"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenRouteHistory(m)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-all"
                          title="View Today's GPS Route & Breadcrumbs"
                        >
                          <MapIcon className="w-4 h-4" />
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

      {/* MARKETER DETAIL & ACTIVITY TIMELINE MODAL */}
      {detailMarketer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  MDO LIVE PROFILE & TIMELINE
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">{detailMarketer.name}</h3>
                <p className="text-xs text-slate-400 font-medium">
                  {detailMarketer.role} • Market: {detailMarketer.assignedMarketName} • Phone: {detailMarketer.mobile}
                </p>
              </div>
              <button
                onClick={() => setDetailMarketer(null)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Status & GPS Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Status</span>
                  <span className={`inline-flex items-center gap-1 mt-1 font-black ${detailMarketer.statusBadgeClass}`}>
                    <span className={`w-2 h-2 rounded-full ${detailMarketer.statusDotClass}`} />
                    <span>{detailMarketer.status}</span>
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Workday Timing</span>
                  <span className="font-extrabold text-slate-800 block mt-1">
                    {detailMarketer.startTime} - {detailMarketer.endTime}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">{detailMarketer.workingHours}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">GPS Accuracy</span>
                  <span className="font-extrabold text-emerald-800 block mt-1">
                    {detailMarketer.hasValidCoords ? `±${detailMarketer.accuracy || 10}m` : 'No GPS'}
                  </span>
                  <span className="text-[10px] text-slate-500">{detailMarketer.relativeUpdateTime}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Device Battery</span>
                  <span className="font-extrabold text-slate-800 block mt-1 flex items-center gap-1">
                    <Battery className="w-3.5 h-3.5 text-slate-600" />
                    <span>{detailMarketer.batteryLevel != null ? `${detailMarketer.batteryLevel}%` : 'N/A'}</span>
                  </span>
                </div>
              </div>

              {/* Performance Counts */}
              <div className="grid grid-cols-4 gap-2 bg-red-50/60 p-3 rounded-2xl border border-red-100">
                <div>
                  <span className="text-[10px] text-red-700 uppercase font-bold block">Shop Visits</span>
                  <span className="text-base font-black text-red-950">{detailMarketer.visitsCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-red-700 uppercase font-bold block">Sales Weight</span>
                  <span className="text-base font-black text-red-950">{detailMarketer.totalOrderKg} KG</span>
                </div>
                <div>
                  <span className="text-[10px] text-red-700 uppercase font-bold block">Orders (₹)</span>
                  <span className="text-base font-black text-red-950">₹{detailMarketer.totalOrderValue.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-red-700 uppercase font-bold block">Collections</span>
                  <span className="text-base font-black text-emerald-800">₹{detailMarketer.totalCollectionValue.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Today's Activity Timeline */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Activity className="w-4 h-4 text-red-600" />
                  <span>Today's Chronological Activity Timeline</span>
                </h4>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {/* Start Day event */}
                  {detailMarketer.isDayStarted && (
                    <div className="flex items-start gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex justify-between font-bold">
                          <span className="text-slate-900">Start My Day (Session 1)</span>
                          <span className="text-slate-500 text-[10px]">{detailMarketer.startTime}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Market: {detailMarketer.assignedMarketName}</p>
                      </div>
                    </div>
                  )}

                  {/* Visits, Orders, Collections */}
                  {detailMarketer.mVisits.map((v, i) => (
                    <div key={`v-${i}`} className="flex items-start gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex justify-between font-bold">
                          <span className="text-slate-900">Shop Visit: {v.shopName}</span>
                          <span className="text-slate-500 text-[10px]">{v.time || '—'}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Outcomes: {v.outcomes?.join(', ') || 'Visited'}</p>
                      </div>
                    </div>
                  ))}

                  {detailMarketer.mOrders.map((o, i) => (
                    <div key={`o-${i}`} className="flex items-start gap-2.5 p-2 bg-amber-50 rounded-xl border border-amber-200">
                      <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex justify-between font-bold">
                          <span className="text-amber-950">Order Placed (#{o.id?.slice(-4) || ''})</span>
                          <span className="text-amber-700 text-[10px]">{o.time || '—'}</span>
                        </div>
                        <p className="text-[11px] text-amber-800">
                          {o.totalKg || 0} KG • ₹{Number(o.grandTotal || o.totalValue || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}

                  {detailMarketer.mCollections.map((c, i) => (
                    <div key={`c-${i}`} className="flex items-start gap-2.5 p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex justify-between font-bold">
                          <span className="text-emerald-950">Payment Collected</span>
                          <span className="text-emerald-700 text-[10px]">{c.time || '—'}</span>
                        </div>
                        <p className="text-[11px] text-emerald-800">
                          ₹{Number(c.amount || 0).toLocaleString('en-IN')} ({c.paymentMode || 'Cash'})
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* End Day event */}
                  {detailMarketer.isDayEnded && (
                    <div className="flex items-start gap-2.5 p-2 bg-slate-100 rounded-xl border border-slate-300">
                      <span className="w-2 h-2 rounded-full bg-slate-500 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex justify-between font-bold">
                          <span className="text-slate-900">End My Day (Day Ended)</span>
                          <span className="text-slate-500 text-[10px]">{detailMarketer.endTime}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Checkout completed successfully.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setDetailMarketer(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TODAY'S ROUTE & LOCATION HISTORY MODAL */}
      {historyMarketer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  TODAY'S ROUTE & LOCATION BREADCRUMBS
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">{historyMarketer.name}</h3>
                <p className="text-xs text-slate-400 font-medium">
                  Date: {todayDate} • Market: {historyMarketer.assignedMarketName}
                </p>
              </div>
              <button
                onClick={() => setHistoryMarketer(null)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Route Map */}
              <div className="rounded-2xl overflow-hidden border border-slate-200 h-64 relative z-0">
                <div ref={routeMapContainerRef} className="w-full h-full" />
              </div>

              {/* Recorded Breadcrumbs Summary */}
              <div>
                <h4 className="font-black text-slate-900 uppercase mb-2">
                  Recorded GPS Waypoints ({historyData?.points?.length || 0} pings recorded)
                </h4>

                {(!historyData?.points || historyData.points.length === 0) ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-400 font-bold">
                    No location history available for this session.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
                    {historyData.points.map((pt, idx) => (
                      <div key={idx} className="p-2.5 flex justify-between items-center bg-white hover:bg-slate-50 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-black text-[10px] flex items-center justify-center border border-slate-300">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-extrabold text-slate-800">{pt.activity || 'Field Movement'}</span>
                            {pt.shopName && <span className="text-blue-700 font-bold ml-1">({pt.shopName})</span>}
                            <div className="text-[10px] text-slate-400">
                              Lat: {pt.lat?.toFixed(5)}, Lng: {pt.lng?.toFixed(5)} (±{pt.accuracy}m)
                            </div>
                          </div>
                        </div>
                        <span className="font-bold text-slate-500 text-[11px]">{pt.time || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setHistoryMarketer(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
