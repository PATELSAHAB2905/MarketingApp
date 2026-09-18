import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_PRODUCTS,
  INITIAL_MARKETS,
  INITIAL_MARKET_ROUTES,
  INITIAL_CONNECTED_MARKETS,
  INITIAL_MARKETERS,
  INITIAL_WEEKLY_ROUTES,
  INITIAL_SHOPS,
  INITIAL_TARGETS,
  INITIAL_HISTORICAL_DAILY_REPORTS,
  MASTER_MARKET_GROUPS,
} from '../services/seedData';
import {
  setDocument,
  deleteDocument,
  checkFirebaseConnection,
  subscribeToCollection,
  batchUpsert,
} from '../services/firestoreService';
import {
  pushAllDataToFirebase as pushAllDataService,
  fetchAllDataFromFirebase,
  COLLECTIONS,
} from '../services/syncService';
import { isShopMatchingRecord, calculatePartyLedger } from '../utils/partyLedgerHelper';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  // 1. Core Masters
  const [masterMarketGroups, setMasterMarketGroups] = useState(() => {
    const s = localStorage.getItem('PATEL_MASTER_MARKET_GROUPS');
    return s ? JSON.parse(s) : MASTER_MARKET_GROUPS;
  });

  const [products, setProducts] = useState(() => {
    const s = localStorage.getItem('PATEL_PRODUCTS');
    return s ? JSON.parse(s) : INITIAL_PRODUCTS;
  });

  const [markets, setMarkets] = useState(() => {
    const s = localStorage.getItem('PATEL_MARKETS');
    return s ? JSON.parse(s) : INITIAL_MARKETS;
  });

  // NEW: Two-Level Market Structure
  const [marketRoutes, setMarketRoutes] = useState(() => {
    const s = localStorage.getItem('PATEL_MARKET_ROUTES');
    return s ? JSON.parse(s) : INITIAL_MARKET_ROUTES;
  });

  const [connectedMarkets, setConnectedMarkets] = useState(() => {
    const s = localStorage.getItem('PATEL_CONNECTED_MARKETS');
    return s ? JSON.parse(s) : INITIAL_CONNECTED_MARKETS;
  });

  const [marketers, setMarketers] = useState(() => {
    const s = localStorage.getItem('PATEL_MARKETERS');
    return s ? JSON.parse(s) : INITIAL_MARKETERS;
  });

  const [weeklyRoutes, setWeeklyRoutes] = useState(() => {
    const s = localStorage.getItem('PATEL_WEEKLY_ROUTES');
    return s ? JSON.parse(s) : INITIAL_WEEKLY_ROUTES;
  });

  const [tempAssignments, setTempAssignments] = useState(() => {
    const s = localStorage.getItem('PATEL_TEMP_ASSIGNMENTS');
    return s ? JSON.parse(s) : [];
  });

  const [shops, setShops] = useState(() => {
    const s = localStorage.getItem('PATEL_SHOPS');
    return s ? JSON.parse(s) : INITIAL_SHOPS;
  });

  const [leads, setLeads] = useState(() => {
    const s = localStorage.getItem('PATEL_LEADS');
    return s ? JSON.parse(s) : [
      { id: 'lead-1', shopName: 'Mahaveer Provision', owner: 'Rakesh Soni', mobile: '9826011111', marketId: 'mkt-pachore', marketerId: 'marketer-1', interestedProduct: 'Mirchi 500g', expectedOrderKg: 20, status: 'Interested', followUpDate: '22-08-2026' },
      { id: 'lead-2', shopName: 'Narendra Traders', owner: 'Narendra Kushwaha', mobile: '9826022222', marketId: 'mkt-pachore', marketerId: 'marketer-1', interestedProduct: 'Haldi 500g', expectedOrderKg: 15, status: 'Follow-up', followUpDate: '24-08-2026' },
    ];
  });

  // Upgraded targets: now date-range based with unique IDs
  const [targets, setTargets] = useState(() => {
    const s = localStorage.getItem('PATEL_TARGETS');
    if (s) {
      const parsed = JSON.parse(s);
      // Migrate old flat targets (array without IDs) to new format
      if (parsed.length > 0 && !parsed[0].id) {
        return INITIAL_TARGETS;
      }
      return parsed;
    }
    return INITIAL_TARGETS;
  });

  // NEW: Import Batches history
  const [importBatches, setImportBatches] = useState(() => {
    const s = localStorage.getItem('PATEL_IMPORT_BATCHES');
    return s ? JSON.parse(s) : [];
  });

  // System GST & Credit Policy Settings
  const [gstConfig, setGstConfig] = useState(() => {
    const s = localStorage.getItem('PATEL_GST_CONFIG');
    return s ? JSON.parse(s) : {
      gstEnabled: true,
      gstRate: 5,
      gstMode: 'Exclusive', // 'Exclusive' or 'Inclusive'
    };
  });

  const [creditPolicy, setCreditPolicy] = useState(() => {
    const s = localStorage.getItem('PATEL_CREDIT_POLICY');
    return s ? JSON.parse(s) : {
      creditPeriodDays: 21,
    };
  });

  const [checkIns, setCheckIns] = useState(() => {
    const s = localStorage.getItem('PATEL_CHECKINS');
    return s ? JSON.parse(s) : [];
  });

  // Real-time live locations for field tracking
  const [liveLocations, setLiveLocations] = useState(() => {
    const s = localStorage.getItem('PATEL_LIVE_LOCATIONS');
    return s ? JSON.parse(s) : {};
  });

  const [visits, setVisits] = useState(() => {
    const s = localStorage.getItem('PATEL_VISITS');
    return s ? JSON.parse(s) : [];
  });

  const [orders, setOrders] = useState(() => {
    const s = localStorage.getItem('PATEL_ORDERS');
    return s ? JSON.parse(s) : [];
  });

  const [collections, setCollections] = useState(() => {
    const s = localStorage.getItem('PATEL_COLLECTIONS');
    return s ? JSON.parse(s) : [];
  });

  const [handovers, setHandovers] = useState(() => {
    const s = localStorage.getItem('PATEL_HANDOVERS');
    return s ? JSON.parse(s) : [];
  });

  const [returns, setReturns] = useState(() => {
    const s = localStorage.getItem('PATEL_RETURNS');
    return s ? JSON.parse(s) : [];
  });

  const [complaints, setComplaints] = useState(() => {
    const s = localStorage.getItem('PATEL_COMPLAINTS');
    return s ? JSON.parse(s) : [];
  });

  const [followups, setFollowups] = useState(() => {
    const s = localStorage.getItem('PATEL_FOLLOWUPS');
    return s ? JSON.parse(s) : [];
  });

  const [marketFeedbacks, setMarketFeedbacks] = useState(() => {
    const s = localStorage.getItem('PATEL_MARKET_FEEDBACKS');
    return s ? JSON.parse(s) : [];
  });

  const [shopPhotos, setShopPhotos] = useState(() => {
    const s = localStorage.getItem('PATEL_SHOP_PHOTOS');
    return s ? JSON.parse(s) : [];
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    const s = localStorage.getItem('PATEL_AUDIT_LOGS');
    return s ? JSON.parse(s) : [];
  });

  const [dailyReports, setDailyReports] = useState(() => {
    const s = localStorage.getItem('PATEL_DAILY_REPORTS');
    return s ? JSON.parse(s) : INITIAL_HISTORICAL_DAILY_REPORTS;
  });

  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [googleSheetsWebhookUrl, setGoogleSheetsWebhookUrl] = useState(() => {
    return localStorage.getItem('PATEL_SHEETS_WEBHOOK') || '';
  });

  // Firebase Real-time State & Status
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [firebaseSyncStatus, setFirebaseSyncStatus] = useState('syncing'); // 'connected' | 'syncing' | 'offline' | 'error'
  const [firebaseError, setFirebaseError] = useState(null);
  const [lastSyncedTime, setLastSyncedTime] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);

  // Background persistence helper
  const persistToFirestore = (collectionName, docId, data) => {
    if (!docId || !data) return;
    setDocument(collectionName, docId, data).catch((err) => {
      console.warn(`[Firestore background write] ${collectionName}/${docId}:`, err?.message || err);
    });
  };

  const removeDocFromFirestore = (collectionName, docId) => {
    if (!docId) return;
    deleteDocument(collectionName, docId).catch((err) => {
      console.warn(`[Firestore background delete] ${collectionName}/${docId}:`, err?.message || err);
    });
  };

  // Save Effects
  useEffect(() => { localStorage.setItem('PATEL_MASTER_MARKET_GROUPS', JSON.stringify(masterMarketGroups)); }, [masterMarketGroups]);
  useEffect(() => { localStorage.setItem('PATEL_PRODUCTS', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('PATEL_MARKETS', JSON.stringify(markets)); }, [markets]);
  useEffect(() => { localStorage.setItem('PATEL_MARKET_ROUTES', JSON.stringify(marketRoutes)); }, [marketRoutes]);
  useEffect(() => { localStorage.setItem('PATEL_CONNECTED_MARKETS', JSON.stringify(connectedMarkets)); }, [connectedMarkets]);
  useEffect(() => { localStorage.setItem('PATEL_MARKETERS', JSON.stringify(marketers)); }, [marketers]);
  useEffect(() => { localStorage.setItem('PATEL_WEEKLY_ROUTES', JSON.stringify(weeklyRoutes)); }, [weeklyRoutes]);
  useEffect(() => { localStorage.setItem('PATEL_TEMP_ASSIGNMENTS', JSON.stringify(tempAssignments)); }, [tempAssignments]);
  useEffect(() => { localStorage.setItem('PATEL_SHOPS', JSON.stringify(shops)); }, [shops]);
  useEffect(() => { localStorage.setItem('PATEL_LEADS', JSON.stringify(leads)); }, [leads]);
  useEffect(() => { localStorage.setItem('PATEL_TARGETS', JSON.stringify(targets)); }, [targets]);
  useEffect(() => { localStorage.setItem('PATEL_IMPORT_BATCHES', JSON.stringify(importBatches)); }, [importBatches]);
  useEffect(() => { localStorage.setItem('PATEL_GST_CONFIG', JSON.stringify(gstConfig)); }, [gstConfig]);
  useEffect(() => { localStorage.setItem('PATEL_CREDIT_POLICY', JSON.stringify(creditPolicy)); }, [creditPolicy]);
  useEffect(() => { localStorage.setItem('PATEL_CHECKINS', JSON.stringify(checkIns)); }, [checkIns]);
  useEffect(() => { localStorage.setItem('PATEL_VISITS', JSON.stringify(visits)); }, [visits]);
  useEffect(() => { localStorage.setItem('PATEL_SHOP_PHOTOS', JSON.stringify(shopPhotos)); }, [shopPhotos]);
  useEffect(() => { localStorage.setItem('PATEL_ORDERS', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('PATEL_COLLECTIONS', JSON.stringify(collections)); }, [collections]);
  useEffect(() => { localStorage.setItem('PATEL_HANDOVERS', JSON.stringify(handovers)); }, [handovers]);
  useEffect(() => { localStorage.setItem('PATEL_RETURNS', JSON.stringify(returns)); }, [returns]);
  useEffect(() => { localStorage.setItem('PATEL_COMPLAINTS', JSON.stringify(complaints)); }, [complaints]);
  useEffect(() => { localStorage.setItem('PATEL_FOLLOWUPS', JSON.stringify(followups)); }, [followups]);
  useEffect(() => { localStorage.setItem('PATEL_MARKET_FEEDBACKS', JSON.stringify(marketFeedbacks)); }, [marketFeedbacks]);
  useEffect(() => { localStorage.setItem('PATEL_AUDIT_LOGS', JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => { localStorage.setItem('PATEL_DAILY_REPORTS', JSON.stringify(dailyReports)); }, [dailyReports]);

  // Real-Time Firebase Listener & Connection Initialization
  useEffect(() => {
    let unsubs = [];
    let isMounted = true;

    const initFirebase = async () => {
      setFirebaseSyncStatus('syncing');
      try {
        const conn = await checkFirebaseConnection();
        if (!isMounted) return;

        if (conn.connected) {
          setIsFirebaseConnected(true);
          setFirebaseSyncStatus('connected');
          setFirebaseError(null);
          setLastSyncedTime(getFormattedTime());

          // Merge function to prevent duplication and preserve local updates
          const mergeItems = (incoming, setLocalState, storageKey) => {
            if (!incoming || incoming.length === 0) return;
            setLocalState((prev) => {
              const map = new Map();
              prev.forEach((item) => map.set(String(item.id), item));
              incoming.forEach((item) => {
                const existing = map.get(String(item.id));
                map.set(String(item.id), existing ? { ...existing, ...item } : item);
              });
              const merged = Array.from(map.values());
              if (storageKey) {
                try { localStorage.setItem(storageKey, JSON.stringify(merged)); } catch (e) {}
              }
              return merged;
            });
          };

          unsubs.push(subscribeToCollection('orders', (items) => mergeItems(items, setOrders, 'PATEL_ORDERS')));
          unsubs.push(subscribeToCollection('collections', (items) => mergeItems(items, setCollections, 'PATEL_COLLECTIONS')));
          unsubs.push(subscribeToCollection('returns', (items) => mergeItems(items, setReturns, 'PATEL_RETURNS')));
          unsubs.push(subscribeToCollection('shops', (items) => mergeItems(items, setShops, 'PATEL_SHOPS')));
          unsubs.push(subscribeToCollection('markets', (items) => mergeItems(items, setMarkets, 'PATEL_MARKETS')));
          unsubs.push(subscribeToCollection('marketers', (items) => mergeItems(items, setMarketers, 'PATEL_MARKETERS')));
          unsubs.push(subscribeToCollection('marketRoutes', (items) => mergeItems(items, setMarketRoutes, 'PATEL_MARKET_ROUTES')));
          unsubs.push(subscribeToCollection('connectedMarkets', (items) => mergeItems(items, setConnectedMarkets, 'PATEL_CONNECTED_MARKETS')));
          unsubs.push(subscribeToCollection('checkIns', (items) => mergeItems(items, setCheckIns, 'PATEL_CHECKINS')));
          unsubs.push(subscribeToCollection('targets', (items) => mergeItems(items, setTargets, 'PATEL_TARGETS')));
          unsubs.push(subscribeToCollection('importBatches', (items) => mergeItems(items, setImportBatches, 'PATEL_IMPORT_BATCHES')));
          unsubs.push(subscribeToCollection('followups', (items) => mergeItems(items, setFollowups, 'PATEL_FOLLOWUPS')));
          unsubs.push(subscribeToCollection('complaints', (items) => mergeItems(items, setComplaints, 'PATEL_COMPLAINTS')));
          unsubs.push(
            subscribeToCollection('liveLocations', (items) => {
              setLiveLocations((prev) => {
                const next = { ...prev };
                items.forEach((loc) => {
                  if (loc.id || loc.marketerId) {
                    const key = String(loc.marketerId || loc.id);
                    next[key] = { ...(next[key] || {}), ...loc };
                  }
                });
                try {
                  localStorage.setItem('PATEL_LIVE_LOCATIONS', JSON.stringify(next));
                } catch (e) {}
                return next;
              });
            })
          );
        } else {
          setIsFirebaseConnected(false);
          setFirebaseSyncStatus('offline');
          setFirebaseError(conn.error || 'Offline / Firestore unavailable');
        }
      } catch (err) {
        if (!isMounted) return;
        setIsFirebaseConnected(false);
        setFirebaseSyncStatus('error');
        setFirebaseError(err.message);
      }
    };

    initFirebase();

    return () => {
      isMounted = false;
      unsubs.forEach((u) => typeof u === 'function' && u());
    };
  }, []);

  // Format Helper IST Asia/Kolkata
  const getFormattedDate = (dateObj = new Date()) => {
    const d = new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getFormattedTime = (dateObj = new Date()) => {
    const d = new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const getDayOfWeekName = (dateStr = getFormattedDate()) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parts[2], parts[1] - 1, parts[0]);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[d.getDay()];
    }
    return 'Monday';
  };

  const addAuditLog = (user, role, action, record, oldValue, newValue) => {
    const log = {
      id: `audit-${Date.now()}`,
      user: user || 'System',
      role: role || 'ADMIN',
      action,
      record,
      oldValue: JSON.stringify(oldValue || {}),
      newValue: JSON.stringify(newValue || {}),
      date: getFormattedDate(),
      time: getFormattedTime(),
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  // getTodayMarket: returns the marketer's assigned market for a given date.
  // Now also returns routeId, connectedMarketId when available.
  const getTodayMarket = (marketerId, dateStr = getFormattedDate()) => {
    const temp = tempAssignments.find(t => t.marketerId === marketerId && t.date === dateStr);
    if (temp) {
      const marketObj = markets.find(m => m.id === temp.marketId);
      return {
        marketId: temp.marketId,
        marketName: temp.marketName || (marketObj ? marketObj.name : 'Assigned Market'),
        routeId: temp.routeId || null,
        connectedMarketId: temp.connectedMarketId || null,
        connectedMarketName: temp.connectedMarketName || null,
        routeType: 'Temporary Assignment',
        reason: temp.reason || 'Admin Temporary Assignment',
        marketObj,
      };
    }

    const dayName = getDayOfWeekName(dateStr);
    const route = weeklyRoutes.find(r => r.marketerId === marketerId && r.day.toLowerCase() === dayName.toLowerCase());
    if (route) {
      const marketObj = markets.find(m => m.id === route.marketId);
      const cm = connectedMarkets.find(c => c.id === route.connectedMarketId);
      return {
        marketId: route.marketId,
        marketName: route.marketName || (marketObj ? marketObj.name : 'Fixed Market'),
        routeId: route.routeId || null,
        connectedMarketId: route.connectedMarketId || null,
        connectedMarketName: cm ? cm.name : (route.marketName || null),
        routeType: 'Normal Weekly Route',
        day: dayName,
        marketObj,
      };
    }

    return null;
  };

  // assignMarketToMarketer: Assign a market directly to a marketer
  const assignMarketToMarketer = (marketId, marketerId) => {
    const marketer = marketers.find(m => m.id === marketerId);
    let updatedMarket = null;
    setMarkets(prev => prev.map(m => {
      if (m.id === marketId) {
        updatedMarket = {
          ...m,
          assignedMarketerId: marketerId || null,
          assignedMarketerName: marketer ? marketer.name : null,
          updatedDate: getFormattedDate(),
        };
        return updatedMarket;
      }
      return m;
    }));
    if (updatedMarket) {
      persistToFirestore('markets', marketId, updatedMarket);
    }
    addAuditLog('Admin', 'ADMIN', 'ASSIGN_MARKET', `Market ${marketId} assigned to ${marketer?.name || 'Unassigned'}`, {}, { marketerId });
  };

  // addMarket: Create a new market and persist
  const addMarket = (marketData) => {
    const rawName = marketData.name?.trim() || '';
    const slug = rawName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const assignedMarketer = marketers.find(m => m.id === marketData.assignedMarketerId);
    const newMarket = {
      id: marketData.id || `mkt-${slug || Date.now()}`,
      name: rawName,
      district: marketData.district?.trim() || 'Shajapur',
      distanceKm: Number(marketData.distanceKm || 50),
      fuelRateKm: Number(marketData.fuelRateKm || 2),
      maxFuelAllowed: Number(marketData.maxFuelAllowed || (Number(marketData.distanceKm || 50) * Number(marketData.fuelRateKm || 2))),
      assignedMarketerId: marketData.assignedMarketerId || null,
      assignedMarketerName: assignedMarketer ? assignedMarketer.name : marketData.assignedMarketerName || null,
      totalShops: 0,
      group: marketData.group || '',
      createdDate: getFormattedDate(),
      createdTime: getFormattedTime(),
      ...marketData,
    };
    setMarkets(prev => [...prev, newMarket]);
    persistToFirestore('markets', newMarket.id, newMarket);
    addAuditLog('Admin', 'ADMIN', 'ADD_MARKET', `Market ${newMarket.name} created`, null, newMarket);
    return newMarket;
  };

  // getAuthorizedShops: returns shops the marketer can access.
  // Rule: All shops belonging to any Market assigned to this marketer are automatically available!
  const getAuthorizedShops = (marketerId, dateStr = getFormattedDate()) => {
    if (!marketerId) return shops;

    // 1. Get all markets assigned directly to this marketer
    const assignedMarketIds = markets
      .filter(m => m.assignedMarketerId === marketerId)
      .map(m => m.id);
    const assignedMarketNames = markets
      .filter(m => m.assignedMarketerId === marketerId)
      .map(m => (m.name || '').toLowerCase().trim());

    const byAssignedMarkets = shops.filter(s => {
      if (s.marketId && assignedMarketIds.includes(s.marketId)) return true;
      if (s.marketName && assignedMarketNames.includes(s.marketName.toLowerCase().trim())) return true;
      if (s.connectedMarketName && assignedMarketNames.includes(s.connectedMarketName.toLowerCase().trim())) return true;
      if (s.assignedMarketerId === marketerId) return true;
      return false;
    });

    // 2. Also check today's route / weekly market
    const todayMarket = getTodayMarket(marketerId, dateStr);
    let byRouteShops = [];
    if (todayMarket) {
      if (todayMarket.routeId) {
        const cmsForRoute = connectedMarkets.filter(c => c.routeId === todayMarket.routeId).map(c => c.id);
        byRouteShops = shops.filter(s =>
          s.routeId === todayMarket.routeId ||
          (s.connectedMarketId && cmsForRoute.includes(s.connectedMarketId)) ||
          (s.marketId && s.marketId.toLowerCase().includes(todayMarket.routeId.replace('route-', '').toLowerCase())) ||
          (s.marketName && s.marketName.toLowerCase() === todayMarket.marketName?.toLowerCase())
        );
      } else if (todayMarket.connectedMarketId) {
        byRouteShops = shops.filter(s => s.connectedMarketId === todayMarket.connectedMarketId);
      } else if (todayMarket.marketId) {
        byRouteShops = shops.filter(s =>
          s.marketId === todayMarket.marketId ||
          (s.marketName && s.marketName.toLowerCase() === todayMarket.marketName?.toLowerCase())
        );
      }
    }

    // Combine distinct shops
    const combinedMap = new Map();
    byAssignedMarkets.forEach(s => combinedMap.set(s.id, s));
    byRouteShops.forEach(s => combinedMap.set(s.id, s));

    if (combinedMap.size > 0) {
      return Array.from(combinedMap.values());
    }

    // Fallback: return all shops
    return shops;
  };

  // getShopOutstanding: Computes exact live ledger balance matching Party Statement report
  const getShopOutstanding = (shopOrId) => {
    if (!shopOrId) return 0;
    const s = typeof shopOrId === 'string' ? shops.find(x => x.id === shopOrId) : shopOrId;
    if (!s) return 0;
    const ledger = calculatePartyLedger(s, orders, collections, returns);
    return ledger.closingBalance;
  };

  // ======= MARKET ROUTE CRUD =======
  const addMarketRoute = (routeData) => {
    const newRoute = {
      id: `route-${Date.now()}`,
      active: true,
      ...routeData,
    };
    setMarketRoutes(prev => [newRoute, ...prev]);
    persistToFirestore('marketRoutes', newRoute.id, newRoute);
    addAuditLog('Admin', 'ADMIN', 'CREATE_MARKET_ROUTE', `Route: ${newRoute.name}`, null, newRoute);
    return newRoute;
  };

  const updateMarketRoute = (id, changes) => {
    let updated = null;
    setMarketRoutes(prev => prev.map(r => {
      if (r.id === id) {
        updated = { ...r, ...changes };
        return updated;
      }
      return r;
    }));
    if (updated) persistToFirestore('marketRoutes', id, updated);
    addAuditLog('Admin', 'ADMIN', 'UPDATE_MARKET_ROUTE', `Route ID: ${id}`, {}, changes);
  };

  const deleteMarketRoute = (id) => {
    setMarketRoutes(prev => prev.filter(r => r.id !== id));
    removeDocFromFirestore('marketRoutes', id);
    addAuditLog('Admin', 'ADMIN', 'DELETE_MARKET_ROUTE', `Route ID: ${id}`, {}, {});
  };

  // ======= CONNECTED MARKET CRUD =======
  const addConnectedMarket = (cmData) => {
    const newCm = {
      id: `cm-${Date.now()}`,
      active: true,
      ...cmData,
    };
    setConnectedMarkets(prev => [newCm, ...prev]);
    persistToFirestore('connectedMarkets', newCm.id, newCm);
    addAuditLog('Admin', 'ADMIN', 'CREATE_CONNECTED_MARKET', `Market: ${newCm.name}`, null, newCm);
    return newCm;
  };

  const updateConnectedMarket = (id, changes) => {
    let updated = null;
    setConnectedMarkets(prev => prev.map(c => {
      if (c.id === id) {
        updated = { ...c, ...changes };
        return updated;
      }
      return c;
    }));
    if (updated) persistToFirestore('connectedMarkets', id, updated);
    addAuditLog('Admin', 'ADMIN', 'UPDATE_CONNECTED_MARKET', `Market ID: ${id}`, {}, changes);
  };

  const deleteConnectedMarket = (id) => {
    setConnectedMarkets(prev => prev.filter(c => c.id !== id));
    removeDocFromFirestore('connectedMarkets', id);
    addAuditLog('Admin', 'ADMIN', 'DELETE_CONNECTED_MARKET', `Market ID: ${id}`, {}, {});
  };

  // ======= TARGET CRUD (date-range based) =======
  const addTarget = (targetData) => {
    const newTarget = {
      id: `tgt-${Date.now()}`,
      active: true,
      createdDate: getFormattedDate(),
      ...targetData,
    };
    setTargets(prev => [newTarget, ...prev]);
    persistToFirestore('targets', newTarget.id, newTarget);
    addAuditLog('Admin', 'ADMIN', 'CREATE_TARGET', `Target for ${targetData.marketerName || targetData.marketerId}`, null, newTarget);
    return newTarget;
  };

  const updateTarget = (id, changes) => {
    let updated = null;
    setTargets(prev => prev.map(t => {
      if (t.id === id) {
        updated = { ...t, ...changes, updatedDate: getFormattedDate() };
        return updated;
      }
      return t;
    }));
    if (updated) persistToFirestore('targets', id, updated);
    addAuditLog('Admin', 'ADMIN', 'UPDATE_TARGET', `Target ID: ${id}`, {}, changes);
  };

  const deleteTarget = (id) => {
    setTargets(prev => prev.filter(t => t.id !== id));
    removeDocFromFirestore('targets', id);
    addAuditLog('Admin', 'ADMIN', 'DELETE_TARGET', `Target ID: ${id}`, {}, {});
  };

  // Returns the most applicable active target for a marketer on a given date
  const getActiveTarget = (marketerId, dateStr = getFormattedDate()) => {
    // Find active targets for this marketer that cover the given date
    const applicableTargets = targets.filter(t => {
      if (t.marketerId !== marketerId) return false;
      if (!t.active) return false;
      // Date range check (DD-MM-YYYY format)
      if (t.startDate && t.endDate) {
        const toDateNum = (dStr) => {
          const parts = dStr.split('-');
          return parseInt(parts[2] + parts[1] + parts[0], 10);
        };
        const dateNum = toDateNum(dateStr);
        return dateNum >= toDateNum(t.startDate) && dateNum <= toDateNum(t.endDate);
      }
      return true; // No date range = always applicable
    });
    // Return most recent (first in array since we prepend on create)
    return applicableTargets[0] || null;
  };

  // ======= HISTORICAL DATA IMPORT =======
  const importHistoricalData = (dataType, rows, batchId) => {
    const batchRecord = {
      id: batchId || `batch-${Date.now()}`,
      dataType,
      rowCount: rows.length,
      importDate: getFormattedDate(),
      importTime: getFormattedTime(),
    };
    setImportBatches(prev => [batchRecord, ...prev]);
    persistToFirestore('importBatches', batchRecord.id, batchRecord);

    if (dataType === 'shops') {
      const newShops = rows.map((row, idx) => ({
        id: row.id || `shop-imp-${Date.now()}-${idx}`,
        source: 'HISTORICAL_IMPORT',
        importBatchId: batchRecord.id,
        importDate: batchRecord.importDate,
        outstanding: 0,
        lastOrderKg: 0,
        lastOrderDate: null,
        highReturnWarning: false,
        status: 'Customer',
        ...row,
      }));
      setShops(prev => [...newShops, ...prev]);
      batchUpsert('shops', newShops);
    } else if (dataType === 'orders') {
      const newOrders = rows.map((row, idx) => ({
        id: row.id || `ord-imp-${Date.now()}-${idx}`,
        source: 'HISTORICAL_IMPORT',
        importBatchId: batchRecord.id,
        importDate: batchRecord.importDate,
        syncStatus: 'Historical',
        ...row,
      }));
      setOrders(prev => [...newOrders, ...prev]);
      batchUpsert('orders', newOrders);
    } else if (dataType === 'collections') {
      const newCollections = rows.map((row, idx) => ({
        id: row.id || `col-imp-${Date.now()}-${idx}`,
        source: 'HISTORICAL_IMPORT',
        importBatchId: batchRecord.id,
        importDate: batchRecord.importDate,
        syncStatus: 'Historical',
        ...row,
      }));
      setCollections(prev => [...newCollections, ...prev]);
      batchUpsert('collections', newCollections);
    } else if (dataType === 'returns') {
      const newReturns = rows.map((row, idx) => ({
        id: row.id || `ret-imp-${Date.now()}-${idx}`,
        source: 'HISTORICAL_IMPORT',
        importBatchId: batchRecord.id,
        importDate: batchRecord.importDate,
        syncStatus: 'Historical',
        ...row,
      }));
      setReturns(prev => [...newReturns, ...prev]);
      batchUpsert('returns', newReturns);
    } else if (dataType === 'visits') {
      const newVisits = rows.map((row, idx) => ({
        id: row.id || `vst-imp-${Date.now()}-${idx}`,
        source: 'HISTORICAL_IMPORT',
        importBatchId: batchRecord.id,
        importDate: batchRecord.importDate,
        syncStatus: 'Historical',
        ...row,
      }));
      setVisits(prev => [...newVisits, ...prev]);
      batchUpsert('visits', newVisits);
    }

    addAuditLog('Admin', 'ADMIN', 'HISTORICAL_IMPORT', `Imported ${rows.length} ${dataType} records`, null, batchRecord);
    return batchRecord;
  };

  // ======= OLD PARTY DATA IMPORT =======
  const importOldPartyData = ({ marketId, marketName, importedBy, fileName, parties, updateExistingIds = [] }) => {
    const batchId = `import-old-${Date.now()}`;
    const importDate = getFormattedDate();
    const importTime = getFormattedTime();

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let totalReceivable = 0;
    let totalPayable = 0;

    const newShopsToAdd = [];
    const shopsToUpdateMap = new Map();

    parties.forEach((p, idx) => {
      const rec = Number(p.receivableBalance ?? p.openingReceivable ?? 0);
      const pay = Number(p.payableBalance ?? p.openingPayable ?? 0);
      totalReceivable += rec;
      totalPayable += pay;

      if (p.isExisting) {
        if (updateExistingIds.includes(p.existingShopId)) {
          shopsToUpdateMap.set(p.existingShopId, {
            openingReceivable: rec,
            openingPayable: pay,
            openingOutstanding: rec,
            outstanding: rec,
            email: p.email || '',
            mobile: p.phone || p.mobile || '',
            source: 'OLD IMPORT',
            importBatchId: batchId,
            importDate,
          });
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        const matchingRoute = marketRoutes.find(
          r => r.id === `route-${marketId.replace('mkt-', '')}` || r.name.toLowerCase() === (marketName || '').toLowerCase()
        );
        const resolvedRouteId = matchingRoute ? matchingRoute.id : (marketId.startsWith('mkt-') ? `route-${marketId.replace('mkt-', '')}` : undefined);

        const newShop = {
          id: `shop-old-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          name: p.name,
          email: p.email || '',
          mobile: p.phone || p.mobile || '',
          address: p.address || `${marketName}`,
          marketId: marketId,
          marketName: marketName,
          routeId: resolvedRouteId,
          connectedMarketName: marketName,
          openingReceivable: rec,
          openingPayable: pay,
          openingOutstanding: rec,
          outstanding: rec,
          source: 'OLD IMPORT',
          importBatchId: batchId,
          importDate,
          importedBy: importedBy || 'Admin',
          status: 'Customer',
          lastOrderKg: 0,
          lastOrderDate: null,
          highReturnWarning: false,
          lat: 23.5 + (Math.random() * 0.1),
          lng: 76.5 + (Math.random() * 0.1),
        };
        newShopsToAdd.push(newShop);
        createdCount++;
      }
    });

    // Update shops state
    setShops(prev => {
      const updated = prev.map(s => {
        if (shopsToUpdateMap.has(s.id)) {
          return { ...s, ...shopsToUpdateMap.get(s.id) };
        }
        return s;
      });
      return [...newShopsToAdd, ...updated];
    });

    const batchRecord = {
      id: batchId,
      dataType: 'old_parties',
      marketId,
      marketName,
      fileName: fileName || 'Party_Data.xlsx',
      totalParties: parties.length,
      newParties: createdCount,
      updatedParties: updatedCount,
      skippedParties: skippedCount,
      totalReceivable,
      totalPayable,
      importDate,
      importTime,
      importedBy: importedBy || 'Admin',
      status: 'Completed',
    };

    setImportBatches(prev => [batchRecord, ...prev]);
    persistToFirestore('importBatches', batchRecord.id, batchRecord);

    const updatedShopsList = Array.from(shopsToUpdateMap.entries()).map(([id, data]) => ({ id, ...data }));
    batchUpsert('shops', [...newShopsToAdd, ...updatedShopsList]);

    addAuditLog('Admin', 'ADMIN', 'OLD_DATA_IMPORT', `Imported ${parties.length} parties for ${marketName}`, null, batchRecord);

    return batchRecord;
  };

  // ======= COMPLETE HISTORICAL BUSINESS DATA IMPORT (MULTI-SHEET / VYAPAR LEDGERS) =======
  const importHistoricalBusinessData = ({
    newShops = [],
    historicalOrders = [],
    historicalCollections = [],
    historicalReturns = [],
    batchMeta = {},
  }) => {
    const batchId = batchMeta.id || `batch-hist-${Date.now()}`;
    const importDate = getFormattedDate();
    const importTime = getFormattedTime();

    // 1. Process & Format New / Updated Shops
    const formattedNewShops = newShops.map((s, idx) => {
      const rec = Number(s.openingReceivable ?? s.receivableBalance ?? s.openingOutstanding ?? s.outstanding ?? 0);
      const pay = Number(s.openingPayable ?? s.payableBalance ?? 0);
      return {
        id: s.id || `shop-hist-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        name: s.name,
        owner: s.owner || '',
        mobile: s.mobile || s.phone || '',
        email: s.email || '',
        address: s.address || s.marketName || 'Main Market',
        marketId: s.marketId || 'mkt-pachore',
        marketName: s.marketName || 'Pachore',
        routeId: s.routeId || undefined,
        connectedMarketId: s.connectedMarketId || undefined,
        connectedMarketName: s.connectedMarketName || s.marketName || undefined,
        openingReceivable: rec,
        openingPayable: pay,
        openingOutstanding: rec,
        outstanding: rec,
        status: 'Customer',
        source: 'OLD_IMPORT',
        dataSource: 'OLD IMPORT',
        isHistorical: true,
        importBatchId: batchId,
        importDate,
        lastOrderKg: 0,
        lastOrderDate: null,
        highReturnWarning: false,
        lat: s.lat || (23.5 + Math.random() * 0.1),
        lng: s.lng || (76.5 + Math.random() * 0.1),
        ...s,
      };
    });

    // 2. Process & Format Historical Orders / Sales
    const formattedOrders = historicalOrders.map((o, idx) => {
      const totalVal = Number(o.grandTotal ?? o.subtotal ?? o.totalValue ?? o.amount ?? 0);
      const totalKgVal = Number(o.totalKg ?? o.quantityKg ?? 0);
      return {
        id: o.id || `ord-hist-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        invoiceNo: o.invoiceNo || o.billNo || `HIST-BILL-${idx + 1}`,
        billNo: o.billNo || o.invoiceNo || `HIST-BILL-${idx + 1}`,
        date: o.date || o.billDate || importDate,
        dateIso: o.dateIso || '',
        shopId: o.shopId || '',
        shopName: o.shopName || o.partyName || 'Customer',
        marketId: o.marketId || '',
        marketName: o.marketName || '',
        totalKg: totalKgVal,
        subtotal: totalVal,
        grandTotal: totalVal,
        totalValue: totalVal,
        paidAmount: Number(o.paidAmount || 0),
        items: Array.isArray(o.items) ? o.items : [],
        source: 'OLD_IMPORT',
        dataSource: 'OLD IMPORT',
        isHistorical: true,
        syncStatus: 'Historical',
        importBatchId: batchId,
        ...o,
      };
    });

    // 3. Process & Format Historical Collections / Payments
    const formattedCollections = historicalCollections.map((c, idx) => {
      const amt = Number(c.amount ?? 0);
      return {
        id: c.id || `col-hist-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        receiptNumber: c.receiptNumber || c.refNo || `HIST-REC-${idx + 1}`,
        refNo: c.refNo || c.receiptNumber || `HIST-REC-${idx + 1}`,
        date: c.date || importDate,
        dateIso: c.dateIso || '',
        shopId: c.shopId || '',
        shopName: c.shopName || c.partyName || 'Customer',
        marketId: c.marketId || '',
        marketName: c.marketName || '',
        amount: amt,
        paymentMode: c.paymentMode || 'Cash',
        remark: c.remark || c.description || 'Historical Payment Collection',
        source: 'OLD_IMPORT',
        dataSource: 'OLD IMPORT',
        isHistorical: true,
        syncStatus: 'Historical',
        importBatchId: batchId,
        ...c,
      };
    });

    // 4. Process & Format Historical Returns / Credit Notes
    const formattedReturns = historicalReturns.map((r, idx) => {
      const retVal = Number(r.returnValue ?? r.amount ?? 0);
      return {
        id: r.id || `ret-hist-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        invoiceNo: r.invoiceNo || r.invoiceRef || `HIST-RET-${idx + 1}`,
        invoiceRef: r.invoiceRef || r.invoiceNo || `HIST-RET-${idx + 1}`,
        date: r.date || importDate,
        dateIso: r.dateIso || '',
        shopId: r.shopId || '',
        shopName: r.shopName || r.partyName || 'Customer',
        marketId: r.marketId || '',
        marketName: r.marketName || '',
        productName: r.productName || 'Historical Goods Return',
        quantityKg: Number(r.quantityKg || 0),
        returnValue: retVal,
        amount: retVal,
        reason: r.reason || 'Historical Sales Return',
        isCreditNote: true,
        source: 'OLD_IMPORT',
        dataSource: 'OLD IMPORT',
        isHistorical: true,
        syncStatus: 'Historical',
        importBatchId: batchId,
        ...r,
      };
    });

    // 5. Create Batch Record
    const batchRecord = {
      id: batchId,
      dataType: 'historical_business_data',
      fileName: batchMeta.fileName || 'Historical_Data.xlsx',
      sheetNames: batchMeta.sheetNames || [],
      totalNewShops: formattedNewShops.length,
      totalOrders: formattedOrders.length,
      totalCollections: formattedCollections.length,
      totalReturns: formattedReturns.length,
      itemsCount: batchMeta.itemsCount || 0,
      totalSalesVal: formattedOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0),
      totalColVal: formattedCollections.reduce((sum, c) => sum + (c.amount || 0), 0),
      totalRetVal: formattedReturns.reduce((sum, r) => sum + (r.returnValue || 0), 0),
      importDate,
      importTime,
      importedBy: 'Admin',
      status: 'Completed',
      ...batchMeta,
    };

    // 6. Update State & LocalStorage
    setShops((prev) => {
      const existingIds = new Set(prev.map((s) => s.id));
      const newToAdd = formattedNewShops.filter((s) => !existingIds.has(s.id));
      const updatedExisting = prev.map((s) => {
        const matchingNew = formattedNewShops.find((ns) => ns.id === s.id);
        return matchingNew ? { ...s, ...matchingNew } : s;
      });
      const result = [...newToAdd, ...updatedExisting];
      localStorage.setItem('PATEL_SHOPS', JSON.stringify(result));
      return result;
    });

    setOrders((prev) => {
      const existingIds = new Set(prev.map((o) => o.id));
      const newOrders = formattedOrders.filter((o) => !existingIds.has(o.id));
      const result = [...newOrders, ...prev];
      localStorage.setItem('PATEL_ORDERS', JSON.stringify(result));
      return result;
    });

    setCollections((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const newCols = formattedCollections.filter((c) => !existingIds.has(c.id));
      const result = [...newCols, ...prev];
      localStorage.setItem('PATEL_COLLECTIONS', JSON.stringify(result));
      return result;
    });

    setReturns((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const newRets = formattedReturns.filter((r) => !existingIds.has(r.id));
      const result = [...newRets, ...prev];
      localStorage.setItem('PATEL_RETURNS', JSON.stringify(result));
      return result;
    });

    setImportBatches((prev) => {
      const result = [batchRecord, ...prev];
      localStorage.setItem('PATEL_IMPORT_BATCHES', JSON.stringify(result));
      return result;
    });

    // 7. Background Firestore Sync
    batchUpsert('shops', formattedNewShops);
    batchUpsert('orders', formattedOrders);
    batchUpsert('collections', formattedCollections);
    batchUpsert('returns', formattedReturns);
    persistToFirestore('importBatches', batchRecord.id, batchRecord);

    addAuditLog(
      'Admin',
      'ADMIN',
      'HISTORICAL_DATA_IMPORT',
      `Imported ${formattedOrders.length} sales, ${formattedCollections.length} payments, ${formattedReturns.length} returns for ${formattedNewShops.length} shops`,
      null,
      batchRecord
    );

    return batchRecord;
  };

  const addCheckIn = (checkInData) => {
    const today = checkInData.date || getFormattedDate();
    const startT = checkInData.startTime || checkInData.createdTime || getFormattedTime();
    const marketerId = checkInData.marketerId;
    let createdOrUpdated = null;

    setCheckIns((prev) => {
      // Find existing check-in for this marketer and date
      const existingIdx = prev.findIndex(
        (c) => c.marketerId === marketerId && (c.date === today || c.createdDate === today)
      );

      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const existingSessions = Array.isArray(existing.sessions) && existing.sessions.length > 0
          ? existing.sessions
          : [{
              sessionNumber: 1,
              startTime: existing.startTime || existing.createdTime || startT,
              endTime: existing.endTime || null,
              status: existing.endTime ? 'ENDED' : 'ACTIVE',
            }];

        const lastSession = existingSessions[existingSessions.length - 1];

        let nextSessions;
        let sessionNum;

        // If the last session was already ended, create a new session (e.g. Session 2)
        if (lastSession && (lastSession.endTime || lastSession.status === 'ENDED' || existing.isDayEnded)) {
          sessionNum = existingSessions.length + 1;
          const newSession = {
            sessionNumber: sessionNum,
            startTime: startT,
            endTime: null,
            status: 'ACTIVE',
          };
          nextSessions = [...existingSessions, newSession];
        } else {
          // If current session is still running, keep it
          sessionNum = lastSession ? lastSession.sessionNumber : 1;
          nextSessions = existingSessions.map((s, idx) =>
            idx === existingSessions.length - 1
              ? { ...s, startTime: s.startTime || startT, endTime: null, status: 'ACTIVE' }
              : s
          );
        }

        createdOrUpdated = {
          ...existing,
          ...checkInData,
          date: today,
          createdDate: existing.createdDate || today,
          startTime: startT, // Current active session start time
          createdTime: existing.createdTime || startT,
          firstStartTime: existing.firstStartTime || existing.startTime || startT,
          endTime: null,
          endedTime: null,
          status: 'ACTIVE',
          isDayEnded: false,
          currentSessionNumber: sessionNum,
          sessions: nextSessions,
          updatedDate: getFormattedDate(),
          updatedTime: getFormattedTime(),
        };

        const updated = [...prev];
        updated[existingIdx] = createdOrUpdated;
        return updated;
      } else {
        // Create brand new daily record with Session 1
        const initialSession = {
          sessionNumber: 1,
          startTime: startT,
          endTime: null,
          status: 'ACTIVE',
        };

        createdOrUpdated = {
          id: `chk-${Date.now()}`,
          date: today,
          createdDate: today,
          startTime: startT,
          createdTime: startT,
          firstStartTime: startT,
          endTime: null,
          endedTime: null,
          status: 'ACTIVE',
          isDayEnded: false,
          currentSessionNumber: 1,
          sessions: [initialSession],
          updatedDate: getFormattedDate(),
          updatedTime: getFormattedTime(),
          syncStatus: isOfflineMode ? 'Pending Sync' : 'Synced',
          ...checkInData,
        };
        return [createdOrUpdated, ...prev];
      }
    });

    addAuditLog(checkInData.marketerName || marketerId, 'MARKETER', 'CHECK_IN', `Start Day (Session) for ${marketerId}`, null, createdOrUpdated);
    if (createdOrUpdated) persistToFirestore('checkIns', createdOrUpdated.id, createdOrUpdated);
    return createdOrUpdated;
  };

  const endMarketerDay = ({ marketerId, date, endTime, remark = '' }) => {
    const today = date || getFormattedDate();
    const endT = endTime || getFormattedTime();
    let updatedRecord = null;

    setCheckIns((prev) => {
      const existingIdx = prev.findIndex(
        (c) => c.marketerId === marketerId && (c.date === today || c.createdDate === today)
      );

      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const existingSessions = Array.isArray(existing.sessions) && existing.sessions.length > 0
          ? existing.sessions
          : [{
              sessionNumber: 1,
              startTime: existing.startTime || existing.createdTime || endT,
              endTime: null,
              status: 'ACTIVE',
            }];

        // Close the latest active session with end time
        const updatedSessions = existingSessions.map((s, idx) => {
          if (idx === existingSessions.length - 1) {
            return {
              ...s,
              endTime: endT,
              status: 'ENDED',
              endRemark: remark,
            };
          }
          return s;
        });

        updatedRecord = {
          ...existing,
          endTime: endT,
          endedTime: endT,
          status: 'INACTIVE',
          isDayEnded: true,
          endRemark: remark,
          sessions: updatedSessions,
          updatedDate: getFormattedDate(),
          updatedTime: getFormattedTime(),
        };
        const updated = [...prev];
        updated[existingIdx] = updatedRecord;
        return updated;
      } else {
        // Create ended record if none existed
        const endedSession = {
          sessionNumber: 1,
          startTime: endT,
          endTime: endT,
          status: 'ENDED',
        };

        updatedRecord = {
          id: `chk-${Date.now()}`,
          marketerId,
          date: today,
          createdDate: today,
          startTime: endT,
          createdTime: endT,
          firstStartTime: endT,
          endTime: endT,
          endedTime: endT,
          status: 'INACTIVE',
          isDayEnded: true,
          currentSessionNumber: 1,
          sessions: [endedSession],
          endRemark: remark,
          updatedDate: getFormattedDate(),
          updatedTime: getFormattedTime(),
          syncStatus: isOfflineMode ? 'Pending Sync' : 'Synced',
        };
        return [updatedRecord, ...prev];
      }
    });

    addAuditLog(marketerId, 'MARKETER', 'END_DAY', `End Day for ${marketerId} at ${endT}`, null, { marketerId, date: today, endTime: endT });
    if (updatedRecord) persistToFirestore('checkIns', updatedRecord.id, updatedRecord);
    return updatedRecord;
  };

  /**
   * Admin remotely ends an active marketer's day session with an audited reason.
   */
  const adminEndMarketerDay = ({ marketerId, marketerName = 'Marketer', reason = 'Admin Remote End Day', date }) => {
    const today = date || getFormattedDate();
    const endT = getFormattedTime();
    let updatedRecord = null;

    setCheckIns((prev) => {
      const existingIdx = prev.findIndex(
        (c) => c.marketerId === marketerId && (c.date === today || c.createdDate === today)
      );

      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const existingSessions = Array.isArray(existing.sessions) && existing.sessions.length > 0
          ? existing.sessions
          : [{
              sessionNumber: 1,
              startTime: existing.startTime || existing.createdTime || endT,
              endTime: null,
              status: 'ACTIVE',
            }];

        const updatedSessions = existingSessions.map((s, idx) => {
          if (idx === existingSessions.length - 1) {
            return {
              ...s,
              endTime: endT,
              status: 'ENDED',
              endedBy: 'Admin',
              endReason: reason,
            };
          }
          return s;
        });

        updatedRecord = {
          ...existing,
          endTime: endT,
          endedTime: endT,
          status: 'INACTIVE',
          isDayEnded: true,
          endedBy: 'Admin',
          endReason: reason,
          sessions: updatedSessions,
          updatedDate: getFormattedDate(),
          updatedTime: getFormattedTime(),
        };
        const updated = [...prev];
        updated[existingIdx] = updatedRecord;
        return updated;
      } else {
        const endedSession = {
          sessionNumber: 1,
          startTime: endT,
          endTime: endT,
          status: 'ENDED',
          endedBy: 'Admin',
          endReason: reason,
        };

        updatedRecord = {
          id: `chk-${Date.now()}`,
          marketerId,
          marketerName,
          date: today,
          createdDate: today,
          startTime: endT,
          createdTime: endT,
          firstStartTime: endT,
          endTime: endT,
          endedTime: endT,
          status: 'INACTIVE',
          isDayEnded: true,
          endedBy: 'Admin',
          endReason: reason,
          currentSessionNumber: 1,
          sessions: [endedSession],
          updatedDate: getFormattedDate(),
          updatedTime: getFormattedTime(),
          syncStatus: isOfflineMode ? 'Pending Sync' : 'Synced',
        };
        return [updatedRecord, ...prev];
      }
    });

    addAuditLog('Admin', 'ADMIN', 'FORCE_END_DAY', `Admin ended day session for ${marketerName} (${marketerId}). Reason: ${reason}`, null, { marketerId, reason, date: today, endTime: endT });
    if (updatedRecord) persistToFirestore('checkIns', updatedRecord.id, updatedRecord);
    return updatedRecord;
  };

  /**
   * Strict Marketer Workday Active Validation
   * Checks if day session is currently ACTIVE for the given marketerId on today's date.
   */
  const isMarketerDayActive = (marketerId) => {
    if (!marketerId) return false;
    const today = getFormattedDate();
    const chk = checkIns.find(
      (c) => c.marketerId === marketerId && (c.date === today || c.createdDate === today)
    );
    return Boolean(chk && chk.status === 'ACTIVE' && !chk.endTime && !chk.isDayEnded);
  };

  const addShopVisit = (visitData) => {
    // Strict Workday Validation: Block Marketers from logging visits without Start My Day
    if (visitData.marketerId && visitData.role !== 'ADMIN' && !isMarketerDayActive(visitData.marketerId)) {
      alert('Your workday has not started. Please submit Start My Day first before logging a shop visit.');
      return null;
    }

    const newVisit = {
      id: `vst-${Date.now()}`,
      createdDate: getFormattedDate(),
      createdTime: getFormattedTime(),
      updatedDate: getFormattedDate(),
      updatedTime: getFormattedTime(),
      syncStatus: isOfflineMode ? 'Pending Sync' : 'Synced',
      ...visitData,
    };
    setVisits(prev => [newVisit, ...prev]);
    persistToFirestore('visits', newVisit.id, newVisit);

    setShops(prev => prev.map(s => {
      if (s.id === visitData.shopId) {
        const updatedShop = {
          ...s,
          lastVisitDate: getFormattedDate(),
          updatedDate: getFormattedDate(),
          updatedTime: getFormattedTime(),
        };
        persistToFirestore('shops', s.id, updatedShop);
        return updatedShop;
      }
      return s;
    }));

    return newVisit;
  };

  // ======= SHOP PHOTOS (GENERAL VISIT & DISPLAY PHOTOS) =======
  const addShopPhoto = (photoData) => {
    // Strict Workday Validation: Block Marketers from uploading photos without Start My Day
    if (photoData.marketerId && photoData.role !== 'ADMIN' && !isMarketerDayActive(photoData.marketerId)) {
      alert('Your workday has not started. Please submit Start My Day first before capturing a shop photo.');
      return null;
    }

    const photoUrl = photoData.photoUrl || photoData.imageData;
    const newPhoto = {
      id: photoData.id || `photo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      shopId: photoData.shopId,
      shopName: photoData.shopName || '',
      visitId: photoData.visitId || null,
      marketerId: photoData.marketerId,
      marketerName: photoData.marketerName || 'Marketer',
      photoType: photoData.photoType || 'Shop Visit Photo',
      photoUrl,
      photoStoragePath: photoData.photoStoragePath || null,
      imageData: photoUrl, // Backward compatibility
      fileSizeKb: photoData.fileSizeKb || photoData.compressedSizeKb || 75,
      originalSizeKb: photoData.originalSizeKb || 0,
      mimeType: photoData.mimeType || 'image/webp',
      isOfflineFallback: photoData.isOfflineFallback || false,
      date: photoData.date || getFormattedDate(),
      time: photoData.time || getFormattedTime(),
      createdDate: getFormattedDate(),
      createdTime: getFormattedTime(),
    };

    setShopPhotos(prev => [newPhoto, ...prev]);
    persistToFirestore('shopPhotos', newPhoto.id, newPhoto);

    setShops(prev => prev.map(s => {
      if (s.id === photoData.shopId) {
        const updatedShop = {
          ...s,
          lastPhotoUrl: photoUrl,
          lastPhotoDate: getFormattedDate(),
          photos: [newPhoto, ...(s.photos || [])],
          updatedDate: getFormattedDate(),
          updatedTime: getFormattedTime(),
        };
        persistToFirestore('shops', s.id, updatedShop);
        return updatedShop;
      }
      return s;
    }));

    addAuditLog(
      photoData.marketerName,
      'MARKETER',
      'ADD_SHOP_PHOTO',
      `Shop photo captured for ${photoData.shopName || photoData.shopId} (${newPhoto.fileSizeKb} KB)`,
      null,
      { shopId: photoData.shopId, photoType: newPhoto.photoType, fileSizeKb: newPhoto.fileSizeKb }
    );

    return newPhoto;
  };

  const deleteShopPhoto = (photoId) => {
    setShopPhotos(prev => prev.filter(p => p.id !== photoId));
    removeDocFromFirestore('shopPhotos', photoId);
  };

  // ======= ORDER ID GENERATOR =======
  // Format: ORD-DDMMYYYY-NNNN (sequential per day, resets each day)
  const generateOrderId = (dateStr) => {
    const key = 'PATEL_ORDER_COUNTER';
    const stored = JSON.parse(localStorage.getItem(key) || '{"date":"","counter":0}');
    const counter = stored.date === dateStr ? stored.counter + 1 : 1;
    localStorage.setItem(key, JSON.stringify({ date: dateStr, counter }));
    const parts = dateStr.split('-'); // DD-MM-YYYY
    const dateCode = (parts[0] || '') + (parts[1] || '') + (parts[2] || '');
    return `ORD-${dateCode}-${String(counter).padStart(4, '0')}`;
  };

  // Add Order with unique ORD-DDMMYYYY-NNNN ID + sync status tracking
  const addOrder = (orderData) => {
    // Strict Workday Validation: Block Marketers from creating orders without Start My Day
    if (orderData.marketerId && orderData.role !== 'ADMIN' && !isMarketerDayActive(orderData.marketerId)) {
      alert('Your workday has not started. Please submit Start My Day first before creating an order.');
      return null;
    }

    const todayStr = orderData.date || getFormattedDate();
    const newOrder = {
      id: generateOrderId(todayStr),
      createdDate: getFormattedDate(),
      createdTime: getFormattedTime(),
      updatedDate: getFormattedDate(),
      updatedTime: getFormattedTime(),
      syncStatus: 'pending', // pending | synced | failed | duplicate
      syncMessage: '',
      source: orderData.source || 'APP',
      dataSource: orderData.dataSource || orderData.source || 'APP',
      ...orderData,
    };
    setOrders(prev => [newOrder, ...prev]);
    persistToFirestore('orders', newOrder.id, newOrder);

    const targetShop = shops.find(s => s.id === orderData.shopId);
    if (targetShop && targetShop.status === 'Lead') {
      setLeads(prev => prev.map(l => l.shopName === targetShop.name ? { ...l, status: 'Converted', firstOrderId: newOrder.id } : l));
    }

    setShops(prev => prev.map(s => {
      if (s.id === orderData.shopId) {
        const isLead = s.status === 'Lead';
        const updatedShop = {
          ...s,
          status: isLead ? 'Customer' : (s.status || 'Customer'),
          lastOrderKg: orderData.totalKg || 0,
          lastOrderDate: getFormattedDate(),
          outstanding: (s.outstanding || 0) + (orderData.grandTotal || orderData.totalValue || 0),
          updatedDate: getFormattedDate(),
          updatedTime: getFormattedTime(),
        };
        persistToFirestore('shops', s.id, updatedShop);
        return updatedShop;
      }
      return s;
    }));

    addAuditLog(orderData.marketerName, 'MARKETER', 'CREATE_ORDER', `Order ${newOrder.id}`, null, newOrder);
    return newOrder;
  };

  // Update sync status for an order (called by sheetsService after sync attempt)
  const updateOrderSyncStatus = (orderId, syncStatus, syncMessage = '') => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updated = {
          ...o,
          syncStatus,
          syncMessage,
          syncedAt: syncStatus === 'synced' || syncStatus === 'duplicate'
            ? getFormattedTime()
            : (o.syncedAt || ''),
        };
        persistToFirestore('orders', o.id, updated);
        return updated;
      }
      return o;
    }));
  };

  // Update existing order (when marketer edits an order)
  const updateOrder = (orderId, updatedOrderData) => {
    const marketerId = updatedOrderData.marketerId;
    if (marketerId && updatedOrderData.role !== 'ADMIN' && !isMarketerDayActive(marketerId)) {
      alert('Your workday has not started. Please submit Start My Day first before editing an order.');
      return null;
    }
    let oldOrder = null;
    let savedOrder = null;

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        oldOrder = o;
        savedOrder = {
          ...o,
          ...updatedOrderData,
          id: orderId, // Keep exact same Order ID
          updatedDate: getFormattedDate(),
          updatedTime: getFormattedTime(),
          syncStatus: 'pending',
          syncMessage: 'Edited - sync pending',
        };
        return savedOrder;
      }
      return o;
    }));

    if (savedOrder) {
      persistToFirestore('orders', orderId, savedOrder);
    }

    // Adjust shop outstanding if total changed
    if (oldOrder && updatedOrderData.shopId) {
      const diff = (updatedOrderData.grandTotal || updatedOrderData.totalValue || 0) - (oldOrder.grandTotal || oldOrder.totalValue || 0);
      if (diff !== 0) {
        setShops(prev => prev.map(s => {
          if (s.id === updatedOrderData.shopId) {
            const updatedShop = {
              ...s,
              outstanding: Math.max(0, (s.outstanding || 0) + diff),
              lastOrderKg: updatedOrderData.totalKg || s.lastOrderKg,
              updatedDate: getFormattedDate(),
              updatedTime: getFormattedTime(),
            };
            persistToFirestore('shops', s.id, updatedShop);
            return updatedShop;
          }
          return s;
        }));
      }
    }

    addAuditLog(updatedOrderData.marketerName || 'MARKETER', 'MARKETER', 'UPDATE_ORDER', `Order ${orderId} edited`, oldOrder, updatedOrderData);
    return savedOrder;
  };

  const addCollection = (collectionData) => {
    // Strict Workday Validation: Block Marketers from recording collections without Start My Day
    if (collectionData.marketerId && collectionData.role !== 'ADMIN' && !isMarketerDayActive(collectionData.marketerId)) {
      alert('Your workday has not started. Please submit Start My Day first before recording a collection.');
      return null;
    }

    const newColl = {
      id: collectionData.id || `col-${Date.now()}`,
      receiptNumber: collectionData.receiptNumber || `RCP-${Math.floor(100000 + Math.random() * 900000)}`,
      createdDate: getFormattedDate(),
      createdTime: getFormattedTime(),
      updatedDate: getFormattedDate(),
      updatedTime: getFormattedTime(),
      syncStatus: isOfflineMode ? 'Pending Sync' : 'Synced',
      source: collectionData.source || 'APP',
      dataSource: collectionData.dataSource || collectionData.source || 'APP',
      ...collectionData,
    };
    setCollections(prev => [newColl, ...prev]);
    persistToFirestore('collections', newColl.id, newColl);

    setShops(prev => prev.map(s => {
      if (s.id === collectionData.shopId) {
        const updatedShop = {
          ...s,
          outstanding: Math.max(0, (s.outstanding || 0) - collectionData.amount),
          lastCollectionDate: getFormattedDate(),
          updatedDate: getFormattedDate(),
          updatedTime: getFormattedTime(),
        };
        persistToFirestore('shops', s.id, updatedShop);
        return updatedShop;
      }
      return s;
    }));

    addAuditLog(collectionData.marketerName, 'MARKETER', 'RECORD_COLLECTION', `Collection ${newColl.id}`, null, newColl);
    return newColl;
  };

  // Update existing collection in-place (when marketer edits today's collection)
  const updateCollection = (collectionId, updatedCollectionData) => {
    const marketerId = updatedCollectionData.marketerId;
    if (marketerId && updatedCollectionData.role !== 'ADMIN' && !isMarketerDayActive(marketerId)) {
      alert('Your workday has not started. Please submit Start My Day first before editing a collection.');
      return null;
    }

    let oldCollection = null;
    let savedCollection = null;

    setCollections(prev => prev.map(c => {
      if (c.id === collectionId) {
        oldCollection = c;
        savedCollection = {
          ...c,
          ...updatedCollectionData,
          id: collectionId, // Keep exact same Collection ID
          receiptNumber: c.receiptNumber || updatedCollectionData.receiptNumber, // Preserve receipt number
          updatedDate: getFormattedDate(),
          updatedTime: getFormattedTime(),
        };
        return savedCollection;
      }
      return c;
    }));

    if (savedCollection) {
      persistToFirestore('collections', collectionId, savedCollection);
    }

    // Adjust shop outstanding if amount changed
    if (oldCollection && (updatedCollectionData.shopId || oldCollection.shopId)) {
      const targetShopId = updatedCollectionData.shopId || oldCollection.shopId;
      const oldAmount = Number(oldCollection.amount) || 0;
      const newAmount = Number(updatedCollectionData.amount) || 0;
      const diff = newAmount - oldAmount; // If newAmount is ₹500 more, outstanding decreases by ₹500

      if (diff !== 0) {
        setShops(prev => prev.map(s => {
          if (s.id === targetShopId) {
            const updatedShop = {
              ...s,
              outstanding: Math.max(0, (s.outstanding || 0) - diff),
              lastCollectionDate: getFormattedDate(),
              updatedDate: getFormattedDate(),
              updatedTime: getFormattedTime(),
            };
            persistToFirestore('shops', s.id, updatedShop);
            return updatedShop;
          }
          return s;
        }));
      }
    }

    addAuditLog(
      updatedCollectionData.marketerName || 'MARKETER',
      'MARKETER',
      'UPDATE_COLLECTION',
      `Collection ${collectionId} edited`,
      oldCollection,
      updatedCollectionData
    );
    return savedCollection;
  };

  const addHandover = (handoverData) => {
    const newHandover = {
      id: `hnd-${Date.now()}`,
      createdDate: getFormattedDate(),
      createdTime: getFormattedTime(),
      updatedDate: getFormattedDate(),
      updatedTime: getFormattedTime(),
      status: handoverData.difference === 0 ? 'Verified' : 'Difference Recorded',
      ...handoverData,
    };
    setHandovers(prev => [newHandover, ...prev]);
    persistToFirestore('handovers', newHandover.id, newHandover);
    addAuditLog(handoverData.marketerName, 'MARKETER', 'COLLECTION_HANDOVER', `Handover ${newHandover.id}`, null, newHandover);
    return newHandover;
  };

  const addReturn = (returnData) => {
    // Strict Workday Validation: Block Marketers from recording returns without Start My Day
    if (returnData.marketerId && returnData.role !== 'ADMIN' && !isMarketerDayActive(returnData.marketerId)) {
      alert('Your workday has not started. Please submit Start My Day first before recording a return.');
      return null;
    }

    const newReturn = {
      id: `ret-${Date.now()}`,
      createdDate: getFormattedDate(),
      createdTime: getFormattedTime(),
      updatedDate: getFormattedDate(),
      updatedTime: getFormattedTime(),
      syncStatus: isOfflineMode ? 'Pending Sync' : 'Synced',
      source: returnData.source || 'APP',
      dataSource: returnData.dataSource || returnData.source || 'APP',
      ...returnData,
    };
    setReturns(prev => [newReturn, ...prev]);
    persistToFirestore('returns', newReturn.id, newReturn);

    setShops(prev => prev.map(s => {
      if (s.id === returnData.shopId) {
        const updatedShop = {
          ...s,
          lastReturnDate: getFormattedDate(),
          highReturnWarning: true,
          updatedDate: getFormattedDate(),
          updatedTime: getFormattedTime(),
        };
        persistToFirestore('shops', s.id, updatedShop);
        return updatedShop;
      }
      return s;
    }));

    addAuditLog(returnData.marketerName, 'MARKETER', 'RECORD_RETURN', `Return ${newReturn.id}`, null, newReturn);
    return newReturn;
  };

  // Update existing return in-place (when marketer edits today's return)
  const updateReturn = (returnId, updatedReturnData) => {
    const marketerId = updatedReturnData.marketerId;
    if (marketerId && updatedReturnData.role !== 'ADMIN' && !isMarketerDayActive(marketerId)) {
      alert('Your workday has not started. Please submit Start My Day first before editing a return.');
      return null;
    }
    let oldReturn = null;
    let savedReturn = null;

    setReturns(prev => prev.map(r => {
      if (r.id === returnId) {
        oldReturn = r;
        savedReturn = {
          ...r,
          ...updatedReturnData,
          id: returnId, // Keep exact same Return ID
          updatedDate: getFormattedDate(),
          updatedTime: getFormattedTime(),
        };
        return savedReturn;
      }
      return r;
    }));

    if (savedReturn) {
      persistToFirestore('returns', returnId, savedReturn);
    }

    addAuditLog(
      updatedReturnData.marketerName || 'MARKETER',
      'MARKETER',
      'UPDATE_RETURN',
      `Return ${returnId} edited`,
      oldReturn,
      updatedReturnData
    );
    return savedReturn;
  };

  const addComplaint = (complaintData) => {
    // Strict Workday Validation: Block Marketers from logging complaints without Start My Day
    if (complaintData.marketerId && complaintData.role !== 'ADMIN' && !isMarketerDayActive(complaintData.marketerId)) {
      alert('Your workday has not started. Please submit Start My Day first before registering a complaint.');
      return null;
    }

    const newComplaint = {
      id: `cmp-${Date.now()}`,
      createdDate: getFormattedDate(),
      createdTime: getFormattedTime(),
      updatedDate: getFormattedDate(),
      updatedTime: getFormattedTime(),
      status: 'Open',
      ...complaintData,
    };
    setComplaints(prev => [newComplaint, ...prev]);
    persistToFirestore('complaints', newComplaint.id, newComplaint);
    addAuditLog(complaintData.marketerName, 'MARKETER', 'CREATE_COMPLAINT', `Complaint ${newComplaint.id}`, null, newComplaint);
    return newComplaint;
  };

  const updateComplaintStatus = (complaintId, newStatus, resolution = '') => {
    let updated = null;
    setComplaints(prev => prev.map(c => {
      if (c.id === complaintId) {
        updated = {
          ...c,
          status: newStatus,
          resolution,
          resolvedDate: getFormattedDate(),
          updatedDate: getFormattedDate(),
          updatedTime: getFormattedTime(),
        };
        return updated;
      }
      return c;
    }));
    if (updated) persistToFirestore('complaints', complaintId, updated);
  };

  const addFollowup = (followupData) => {
    // Strict Workday Validation: Block Marketers from logging follow-ups without Start My Day
    if (followupData.marketerId && followupData.role !== 'ADMIN' && !isMarketerDayActive(followupData.marketerId)) {
      alert('Your workday has not started. Please submit Start My Day first before logging a follow-up.');
      return null;
    }

    const newFollowup = {
      id: `flw-${Date.now()}`,
      createdDate: getFormattedDate(),
      createdTime: getFormattedTime(),
      updatedDate: getFormattedDate(),
      updatedTime: getFormattedTime(),
      status: 'Pending',
      ...followupData,
    };
    setFollowups(prev => [newFollowup, ...prev]);
    persistToFirestore('followups', newFollowup.id, newFollowup);
    return newFollowup;
  };

  const addNewShop = (shopData) => {
    // Strict Workday Validation: Block Marketers from creating shops without Start My Day
    const marketerId = shopData.createdByMarketerId || shopData.marketerId;
    if (marketerId && shopData.role !== 'ADMIN' && !isMarketerDayActive(marketerId)) {
      alert('Your workday has not started. Please submit Start My Day first before registering a new shop.');
      return null;
    }

    const newShop = {
      id: `shop-${Date.now()}`,
      status: shopData.isLead ? 'Lead' : 'Customer',
      outstanding: 0,
      lastOrderKg: 0,
      lastOrderDate: null,
      highReturnWarning: false,
      source: shopData.source || 'APP',
      dataSource: shopData.dataSource || shopData.source || 'APP',
      createdDate: getFormattedDate(),
      createdTime: getFormattedTime(),
      updatedDate: getFormattedDate(),
      updatedTime: getFormattedTime(),
      ...shopData,
    };
    setShops(prev => [newShop, ...prev]);
    persistToFirestore('shops', newShop.id, newShop);
    addAuditLog('User', 'USER', 'ADD_SHOP', `Shop ${newShop.name}`, null, newShop);
    return newShop;
  };

  const updateShop = (shopId, updatedData) => {
    let savedShop = null;
    let oldShopName = '';

    setShops((prev) => {
      const updated = prev.map((s) => {
        if (s.id === shopId) {
          oldShopName = s.name;
          savedShop = {
            ...s,
            ...updatedData,
            id: shopId,
            updatedDate: getFormattedDate(),
            updatedTime: getFormattedTime(),
          };
          return savedShop;
        }
        return s;
      });
      localStorage.setItem('PATEL_SHOPS', JSON.stringify(updated));
      return updated;
    });

    if (savedShop) {
      persistToFirestore('shops', shopId, savedShop);

      // If party name changed, cascade update orders, collections, returns
      if (updatedData.name && oldShopName && updatedData.name !== oldShopName) {
        const newName = updatedData.name;
        const fakeOldShop = { id: shopId, name: oldShopName };

        setOrders((prev) => {
          const updated = prev.map((o) => {
            if (isShopMatchingRecord(o, fakeOldShop)) {
              return { ...o, shopName: newName, shopId };
            }
            return o;
          });
          localStorage.setItem('PATEL_ORDERS', JSON.stringify(updated));
          return updated;
        });

        setCollections((prev) => {
          const updated = prev.map((c) => {
            if (isShopMatchingRecord(c, fakeOldShop)) {
              return { ...c, shopName: newName, shopId };
            }
            return c;
          });
          localStorage.setItem('PATEL_COLLECTIONS', JSON.stringify(updated));
          return updated;
        });

        setReturns((prev) => {
          const updated = prev.map((r) => {
            if (isShopMatchingRecord(r, fakeOldShop)) {
              return { ...r, shopName: newName, shopId };
            }
            return r;
          });
          localStorage.setItem('PATEL_RETURNS', JSON.stringify(updated));
          return updated;
        });
      }

      addAuditLog('Admin', 'ADMIN', 'UPDATE_SHOP', `Updated shop ${savedShop.name}`, null, savedShop);
    }
    return savedShop;
  };

  const deleteShop = (shopIdentifier, deleteTransactions = true) => {
    let targetId = '';
    let targetName = '';
    let targetPhone = '';

    if (typeof shopIdentifier === 'object' && shopIdentifier !== null) {
      targetId = shopIdentifier.id || '';
      targetName = shopIdentifier.name || shopIdentifier.shopName || shopIdentifier.partyName || '';
      targetPhone = shopIdentifier.mobile || shopIdentifier.phone || '';
    } else {
      targetId = String(shopIdentifier || '');
    }

    if (!targetName && targetId) {
      const foundShop = shops.find((s) => s.id === targetId);
      if (foundShop) {
        targetName = foundShop.name || '';
        targetPhone = foundShop.mobile || foundShop.phone || '';
      } else {
        const foundOrder = orders.find((o) => o.shopId === targetId || o.id === targetId);
        if (foundOrder) targetName = foundOrder.shopName || '';
        const foundCol = collections.find((c) => c.shopId === targetId || c.id === targetId);
        if (foundCol) targetName = foundCol.shopName || '';
      }
    }

    const targetShop = {
      id: targetId,
      name: targetName,
      mobile: targetPhone,
      phone: targetPhone,
    };

    const isMatch = (item) => {
      if (!item) return false;
      if (targetId && (item.id === targetId || item.shopId === targetId)) return true;
      if (isShopMatchingRecord(item, targetShop)) return true;
      return false;
    };

    // 1. Remove from shops master (matches by exact ID or fuzzy name)
    setShops((prev) => {
      const deleted = prev.filter(isMatch);
      deleted.forEach((s) => deleteDocument('shops', s.id).catch(() => {}));
      const remaining = prev.filter((s) => !isMatch(s));
      localStorage.setItem('PATEL_SHOPS', JSON.stringify(remaining));
      return remaining;
    });

    if (deleteTransactions) {
      // 2. Delete Orders (Historical & Live)
      setOrders((prev) => {
        const deleted = prev.filter(isMatch);
        deleted.forEach((o) => deleteDocument('orders', o.id).catch(() => {}));
        const remaining = prev.filter((o) => !isMatch(o));
        localStorage.setItem('PATEL_ORDERS', JSON.stringify(remaining));
        return remaining;
      });

      // 3. Delete Collections / Payments (Historical & Live)
      setCollections((prev) => {
        const deleted = prev.filter(isMatch);
        deleted.forEach((c) => deleteDocument('collections', c.id).catch(() => {}));
        const remaining = prev.filter((c) => !isMatch(c));
        localStorage.setItem('PATEL_COLLECTIONS', JSON.stringify(remaining));
        return remaining;
      });

      // 4. Delete Returns (Historical & Live)
      setReturns((prev) => {
        const deleted = prev.filter(isMatch);
        deleted.forEach((r) => deleteDocument('returns', r.id).catch(() => {}));
        const remaining = prev.filter((r) => !isMatch(r));
        localStorage.setItem('PATEL_RETURNS', JSON.stringify(remaining));
        return remaining;
      });

      // 5. Delete Visits
      setVisits((prev) => {
        const remaining = prev.filter((v) => !isMatch(v));
        localStorage.setItem('PATEL_VISITS', JSON.stringify(remaining));
        return remaining;
      });

      // 6. Delete Complaints
      setComplaints((prev) => {
        const remaining = prev.filter((cmp) => !isMatch(cmp));
        localStorage.setItem('PATEL_COMPLAINTS', JSON.stringify(remaining));
        return remaining;
      });

      // 7. Delete Follow-ups
      setFollowups((prev) => {
        const remaining = prev.filter((flw) => !isMatch(flw));
        localStorage.setItem('PATEL_FOLLOWUPS', JSON.stringify(remaining));
        return remaining;
      });

      // 8. Delete Photos
      setShopPhotos((prev) => {
        const remaining = prev.filter((p) => !isMatch(p));
        localStorage.setItem('PATEL_SHOP_PHOTOS', JSON.stringify(remaining));
        return remaining;
      });

      // 9. Delete Leads
      setLeads((prev) => {
        const remaining = prev.filter((l) => !isMatch({ shopName: l.shopName, mobile: l.mobile }));
        return remaining;
      });
    }

    addAuditLog('Admin', 'ADMIN', 'DELETE_SHOP', `Deleted shop ${targetName || targetId} and all associated historical & current transactions`, targetShop, null);
    return true;
  };

  const deleteOrder = (orderId) => {
    if (!orderId) return;
    setOrders((prev) => {
      const remaining = prev.filter((o) => o.id !== orderId);
      localStorage.setItem('PATEL_ORDERS', JSON.stringify(remaining));
      return remaining;
    });
    deleteDocument('orders', orderId).catch(() => {});
    addAuditLog('Admin', 'ADMIN', 'DELETE_ORDER', `Deleted order ${orderId}`, null, null);
  };

  const deleteCollection = (collectionId) => {
    if (!collectionId) return;
    setCollections((prev) => {
      const remaining = prev.filter((c) => c.id !== collectionId);
      localStorage.setItem('PATEL_COLLECTIONS', JSON.stringify(remaining));
      return remaining;
    });
    deleteDocument('collections', collectionId).catch(() => {});
    addAuditLog('Admin', 'ADMIN', 'DELETE_COLLECTION', `Deleted collection ${collectionId}`, null, null);
  };

  const deleteReturn = (returnId) => {
    if (!returnId) return;
    setReturns((prev) => {
      const remaining = prev.filter((r) => r.id !== returnId);
      localStorage.setItem('PATEL_RETURNS', JSON.stringify(remaining));
      return remaining;
    });
    deleteDocument('returns', returnId).catch(() => {});
    addAuditLog('Admin', 'ADMIN', 'DELETE_RETURN', `Deleted return ${returnId}`, null, null);
  };

  const deleteImportBatch = (batchId) => {
    if (!batchId) return;
    setImportBatches((prev) => {
      const remaining = prev.filter((b) => b.id !== batchId);
      localStorage.setItem('PATEL_IMPORT_BATCHES', JSON.stringify(remaining));
      return remaining;
    });
    deleteDocument('importBatches', batchId).catch(() => {});

    // Delete records created by this batch
    setShops((prev) => {
      const deleted = prev.filter((s) => s.importBatchId === batchId);
      deleted.forEach((s) => deleteDocument('shops', s.id).catch(() => {}));
      const remaining = prev.filter((s) => s.importBatchId !== batchId);
      localStorage.setItem('PATEL_SHOPS', JSON.stringify(remaining));
      return remaining;
    });
    setOrders((prev) => {
      const deleted = prev.filter((o) => o.importBatchId === batchId);
      deleted.forEach((o) => deleteDocument('orders', o.id).catch(() => {}));
      const remaining = prev.filter((o) => o.importBatchId !== batchId);
      localStorage.setItem('PATEL_ORDERS', JSON.stringify(remaining));
      return remaining;
    });
    setCollections((prev) => {
      const deleted = prev.filter((c) => c.importBatchId === batchId);
      deleted.forEach((c) => deleteDocument('collections', c.id).catch(() => {}));
      const remaining = prev.filter((c) => c.importBatchId !== batchId);
      localStorage.setItem('PATEL_COLLECTIONS', JSON.stringify(remaining));
      return remaining;
    });
    setReturns((prev) => {
      const deleted = prev.filter((r) => r.importBatchId === batchId);
      deleted.forEach((r) => deleteDocument('returns', r.id).catch(() => {}));
      const remaining = prev.filter((r) => r.importBatchId !== batchId);
      localStorage.setItem('PATEL_RETURNS', JSON.stringify(remaining));
      return remaining;
    });
    addAuditLog('Admin', 'ADMIN', 'DELETE_IMPORT_BATCH', `Deleted import batch ${batchId}`, null, null);
  };

  const addMarketFeedback = (feedbackData) => {
    // Strict Workday Validation: Block Marketers from submitting feedback without Start My Day
    if (feedbackData.marketerId && feedbackData.role !== 'ADMIN' && !isMarketerDayActive(feedbackData.marketerId)) {
      alert('Your workday has not started. Please submit Start My Day first before submitting market feedback.');
      return null;
    }

    const newFb = {
      id: `fbk-${Date.now()}`,
      createdDate: getFormattedDate(),
      createdTime: getFormattedTime(),
      updatedDate: getFormattedDate(),
      updatedTime: getFormattedTime(),
      ...feedbackData,
    };
    setMarketFeedbacks(prev => [newFb, ...prev]);
    persistToFirestore('marketFeedbacks', newFb.id, newFb);
    return newFb;
  };

  const addTempAssignment = (assignmentData) => {
    const newAssign = {
      id: `tmp-${Date.now()}`,
      createdDate: getFormattedDate(),
      createdTime: getFormattedTime(),
      status: 'Active',
      ...assignmentData,
    };
    setTempAssignments(prev => [newAssign, ...prev]);
    persistToFirestore('tempAssignments', newAssign.id, newAssign);
    addAuditLog(assignmentData.assignedBy || 'Admin', 'ADMIN', 'CREATE_TEMP_ROUTE', `Override for ${assignmentData.date}`, null, newAssign);
    return newAssign;
  };

  const removeTempAssignment = (id) => {
    setTempAssignments(prev => prev.filter(t => t.id !== id));
    removeDocFromFirestore('tempAssignments', id);
  };

  // ======= FULL FIREBASE CLOUD MIGRATION & SYNC UTILITY =======
  const pushAllDataToFirebase = async () => {
    setIsMigrating(true);
    setFirebaseSyncStatus('syncing');
    try {
      const summary = await pushAllDataService({
        markets,
        marketRoutes,
        connectedMarkets,
        marketers,
        shops,
        orders,
        collections,
        returns,
        handovers,
        complaints,
        followups,
        targets,
        checkIns,
        visits,
        auditLogs,
        importBatches,
        products,
        dailyReports,
        gstConfig,
        creditPolicy,
      });
      setIsFirebaseConnected(true);
      setFirebaseSyncStatus('connected');
      setFirebaseError(null);
      setLastSyncedTime(getFormattedTime());
      addAuditLog('Admin', 'ADMIN', 'FIREBASE_MIGRATION', `Uploaded ${summary.totalRecords} records to Firebase Cloud Firestore`, null, summary);
      return summary;
    } catch (err) {
      console.error('[Firebase Push Error]:', err);
      setFirebaseError(err.message);
      setFirebaseSyncStatus('error');
      throw err;
    } finally {
      setIsMigrating(false);
    }
  };

  const refreshFromFirebase = async () => {
    setFirebaseSyncStatus('syncing');
    try {
      const { data, totalFetched } = await fetchAllDataFromFirebase();
      if (totalFetched > 0) {
        if (data.markets?.length) setMarkets(data.markets);
        if (data.marketRoutes?.length) setMarketRoutes(data.marketRoutes);
        if (data.connectedMarkets?.length) setConnectedMarkets(data.connectedMarkets);
        if (data.marketers?.length) setMarketers(data.marketers);
        if (data.shops?.length) setShops(data.shops);
        if (data.orders?.length) setOrders(data.orders);
        if (data.collections?.length) setCollections(data.collections);
        if (data.returns?.length) setReturns(data.returns);
        if (data.handovers?.length) setHandovers(data.handovers);
        if (data.complaints?.length) setComplaints(data.complaints);
        if (data.followups?.length) setFollowups(data.followups);
        if (data.targets?.length) setTargets(data.targets);
        if (data.checkIns?.length) setCheckIns(data.checkIns);
        if (data.visits?.length) setVisits(data.visits);
        if (data.auditLogs?.length) setAuditLogs(data.auditLogs);
        if (data.importBatches?.length) setImportBatches(data.importBatches);
        if (data.products?.length) setProducts(data.products);
        if (data.dailyReports?.length) setDailyReports(data.dailyReports);
      }
      setIsFirebaseConnected(true);
      setFirebaseSyncStatus('connected');
      setFirebaseError(null);
      setLastSyncedTime(getFormattedTime());
      return { success: true, totalFetched };
    } catch (err) {
      console.error('[Firebase Refresh Error]:', err);
      setFirebaseError(err.message);
      setFirebaseSyncStatus('error');
      throw err;
    }
  };

  const syncToFirebase = async () => {
    return pushAllDataToFirebase();
  };

  const resetToSeedData = () => {
    setProducts(INITIAL_PRODUCTS);
    setMarkets(INITIAL_MARKETS);
    setMarketRoutes(INITIAL_MARKET_ROUTES);
    setConnectedMarkets(INITIAL_CONNECTED_MARKETS);
    setMarketers(INITIAL_MARKETERS);
    setWeeklyRoutes(INITIAL_WEEKLY_ROUTES);
    setShops(INITIAL_SHOPS);
    setTargets(INITIAL_TARGETS);
    setDailyReports(INITIAL_HISTORICAL_DAILY_REPORTS);
    setImportBatches([]);
    setCheckIns([]);
    setVisits([]);
    setOrders([]);
    setCollections([]);
    setHandovers([]);
    setReturns([]);
    setComplaints([]);
    setFollowups([]);
    setMarketFeedbacks([]);
    setTempAssignments([]);
    setAuditLogs([]);
    localStorage.clear();
  };

  return (
    <DataContext.Provider
      value={{
        getFormattedDate,
        getFormattedTime,
        getDayOfWeekName,
        getTodayMarket,
        getAuthorizedShops,
        getShopOutstanding,
        getActiveTarget,
        products, setProducts,
        masterMarketGroups, setMasterMarketGroups,
        markets, setMarkets, addMarket, assignMarketToMarketer,
        marketRoutes, setMarketRoutes, addMarketRoute, updateMarketRoute, deleteMarketRoute,
        connectedMarkets, setConnectedMarkets, addConnectedMarket, updateConnectedMarket, deleteConnectedMarket,
        marketers, setMarketers,
        weeklyRoutes, setWeeklyRoutes,
        tempAssignments, setTempAssignments, addTempAssignment, removeTempAssignment,
        shops, setShops, addNewShop, updateShop, deleteShop,
        leads, setLeads,
        targets, setTargets, addTarget, updateTarget, deleteTarget,
        importBatches, setImportBatches, importHistoricalData, importHistoricalBusinessData, importOldPartyData,
        gstConfig, setGstConfig,
        creditPolicy, setCreditPolicy,
        checkIns, addCheckIn, endMarketerDay, adminEndMarketerDay,
        liveLocations, setLiveLocations,
        isMarketerDayActive,
        visits, addShopVisit,
        shopPhotos, setShopPhotos, addShopPhoto, deleteShopPhoto,
        orders, addOrder, updateOrder, updateOrderSyncStatus, deleteOrder,
        collections, addCollection, updateCollection, deleteCollection,
        handovers, addHandover,
        returns, addReturn, updateReturn, deleteReturn,
        deleteImportBatch,
        complaints, addComplaint, updateComplaintStatus,
        followups, addFollowup,
        marketFeedbacks, addMarketFeedback,
        auditLogs, addAuditLog,
        dailyReports, setDailyReports,
        isOfflineMode, setIsOfflineMode,
        googleSheetsWebhookUrl, setGoogleSheetsWebhookUrl,
        resetToSeedData,
        // Firebase Cloud Firestore
        isFirebaseConnected,
        firebaseSyncStatus,
        firebaseError,
        lastSyncedTime,
        isMigrating,
        syncToFirebase,
        pushAllDataToFirebase,
        refreshFromFirebase,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);

