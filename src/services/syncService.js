import { batchUpsert, getCollection, setDocument } from './firestoreService';

export const COLLECTIONS = [
  'markets',
  'marketRoutes',
  'connectedMarkets',
  'marketers',
  'shops',
  'orders',
  'collections',
  'returns',
  'handovers',
  'complaints',
  'followups',
  'targets',
  'checkIns',
  'visits',
  'auditLogs',
  'importBatches',
  'products',
  'dailyReports',
];

/**
 * Pushes all in-memory / local storage data to Firebase Cloud Firestore.
 * Preserves all unique IDs, timestamps, and relationships.
 */
export async function pushAllDataToFirebase(allData) {
  const summary = {
    startedAt: new Date().toISOString(),
    totalCollections: COLLECTIONS.length,
    results: {},
    totalRecords: 0,
    errors: [],
  };

  for (const col of COLLECTIONS) {
    try {
      const items = allData[col] || [];
      if (Array.isArray(items) && items.length > 0) {
        const res = await batchUpsert(col, items);
        summary.results[col] = { success: true, count: res.count };
        summary.totalRecords += res.count;
      } else {
        summary.results[col] = { success: true, count: 0 };
      }
    } catch (err) {
      console.error(`[Push Migration Error] Failed to push collection "${col}":`, err);
      summary.results[col] = { success: false, count: 0, error: err.message };
      summary.errors.push({ collection: col, error: err.message });
    }
  }

  // Also save system metadata/settings document
  try {
    await setDocument('systemSettings', 'appConfig', {
      gstConfig: allData.gstConfig || null,
      creditPolicy: allData.creditPolicy || null,
      lastMigrationAt: new Date().toISOString(),
      appName: 'Patel Sahab Spices Marketing Management',
    });
    summary.results['systemSettings'] = { success: true, count: 1 };
  } catch (err) {
    console.warn('[Push Migration Warning] systemSettings config write:', err);
  }

  summary.completedAt = new Date().toISOString();
  return summary;
}

/**
 * Fetches all collections from Firebase Cloud Firestore.
 */
export async function fetchAllDataFromFirebase() {
  const data = {};
  let totalFetched = 0;

  for (const col of COLLECTIONS) {
    try {
      const items = await getCollection(col);
      data[col] = items;
      totalFetched += items.length;
    } catch (err) {
      console.warn(`[Fetch Sync Warning] Collection "${col}":`, err.message);
      data[col] = [];
    }
  }

  return { data, totalFetched };
}
