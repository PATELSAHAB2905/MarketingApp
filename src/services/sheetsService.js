// Patel Sahab Spices – Google Sheets Sync Service
// Uses Google Apps Script Web App as a secure server-side proxy.
// No API keys or service-account credentials required in frontend code.
// All secrets stay inside Google Apps Script, which runs with sheet-owner permissions.

// ─────────────────────────────────────────────
// APPS SCRIPT CODE (deploy once inside the Google Sheet)
// Extensions → Apps Script → paste the code below → Deploy → Web App
// ─────────────────────────────────────────────
export const APPS_SCRIPT_CODE = `/**
 * @OnlyCurrentDoc
 * Restricts authorization scope exclusively to this spreadsheet only.
 * Scope: https://www.googleapis.com/auth/spreadsheets.currentonly
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'testConnection') {
      return respond({ status: 'ok', message: 'Patel Sahab Spices – Google Sheets connection is working!' });
    }
    if (data.action === 'syncOrder') {
      return syncOrder(data.marketerName, data.order);
    }
    return respond({ status: 'error', message: 'Unknown action: ' + data.action });
  } catch (err) {
    return respond({ status: 'error', message: 'Server error: ' + err.message });
  }
}

function doGet(e) {
  return respond({ status: 'ok', message: 'Patel Sahab Spices Orders Sync API – Running' });
}

function syncOrder(marketerName, order) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get or create marketer tab
  var sheet = ss.getSheetByName(marketerName);
  if (!sheet) {
    sheet = ss.insertSheet(marketerName);
    var headers = ['Date', 'Order ID', 'Route / Market', 'Shop Name', 'Product', 'Pack Size', 'Qty (KG)', 'Price/KG (₹)', 'Amount (₹)', 'Grand Total (₹)', 'Remarks'];
    sheet.appendRow(headers);
    var hr = sheet.getRange(1, 1, 1, headers.length);
    hr.setFontWeight('bold').setBackground('#1e293b').setFontColor('#fbbf24');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 110); // Date
    sheet.setColumnWidth(2, 175); // Order ID
    sheet.setColumnWidth(3, 125); // Route
    sheet.setColumnWidth(4, 210); // Shop Name
    sheet.setColumnWidth(5, 160); // Product
    sheet.setColumnWidth(6, 95);  // Pack Size
    sheet.setColumnWidth(7, 80);  // Qty KG
    sheet.setColumnWidth(8, 110); // Price
    sheet.setColumnWidth(9, 110); // Amount
    sheet.setColumnWidth(10, 130); // Grand Total
    sheet.setColumnWidth(11, 200); // Remarks
  }

  // Duplicate prevention – scan Order ID column (B) for existing orderId
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var existingIds = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
    if (existingIds.indexOf(order.orderId) !== -1) {
      return respond({ status: 'duplicate', message: 'Order ' + order.orderId + ' is already synced. Duplicate prevented.' });
    }
  }

  // Write order rows in grouped block format
  var items = order.items || [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var isFirst = (i === 0);
    var isLast  = (i === items.length - 1);

    var row = [
      isFirst ? (order.date || '') : '',
      isFirst ? (order.orderId || '') : '',
      isFirst ? (order.routeName || order.marketName || '') : '',
      isFirst ? (order.shopName || '') : '',
      item.productName || '',
      item.packSize || (item.orderType === 'POUCH_10' ? '₹10 MRP Pouch' : ''),
      item.quantityKg != null ? item.quantityKg : '',
      item.pricePerKg != null ? item.pricePerKg : (item.sellingPrice != null ? item.sellingPrice : ''),
      item.subtotal != null ? item.subtotal : '',
      isLast ? (order.grandTotal != null ? order.grandTotal : '') : '',
      isFirst ? (order.remark || '') : ''
    ];

    sheet.appendRow(row);
  }

  // Blank separator row between orders (visual grouping)
  sheet.appendRow(['', '', '', '', '', '', '', '', '', '', '']);

  return respond({ status: 'synced', message: 'Order ' + order.orderId + ' synced to "' + marketerName + '" tab.' });
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

// ─────────────────────────────────────────────
// SYNC SERVICE – called from the frontend
// ─────────────────────────────────────────────

const WEBHOOK_KEY = 'PATEL_SHEETS_WEBHOOK';

export const getSheetsWebhookUrl = () => localStorage.getItem(WEBHOOK_KEY) || '';
export const saveSheetsWebhookUrl = (url) => localStorage.setItem(WEBHOOK_KEY, url);

/**
 * Formats an order object into the payload expected by the Apps Script.
 */
export const formatOrderPayload = (order, marketerName) => {
  const items = (order.items || []).map((item) => ({
    productName: item.productName || 'Unknown Product',
    packSize: item.packSize || (item.orderType === 'POUCH_10' ? '₹10 MRP Pouch' : ''),
    quantityKg: item.quantityKg ?? 0,
    quantityPouch: item.quantityPouch ?? 0,
    orderType: item.orderType || 'KG',
    pricePerKg: item.sellingPrice ?? item.unitPrice ?? 0,
    subtotal: item.subtotal ?? 0,
  }));

  return {
    action: 'syncOrder',
    marketerName: marketerName || 'Unknown',
    order: {
      orderId: order.id,
      date: order.date || order.createdDate,
      routeName: order.routeName || order.marketName || '',
      marketName: order.marketName || '',
      shopName: order.shopName || '',
      items,
      subtotal: order.subtotal ?? 0,
      gstRate: order.gstRate ?? 0,
      gstAmount: order.gstAmount ?? 0,
      grandTotal: order.grandTotal ?? order.totalValue ?? 0,
      remark: order.remark || '',
    },
  };
};

/**
 * Syncs a single order to Google Sheets via the Apps Script Web App.
 * Returns { success, status, message }
 * status: 'synced' | 'duplicate' | 'failed' | 'no_webhook'
 */
export const syncOrderToSheets = async (order, marketerName, webhookUrl) => {
  const url = webhookUrl || getSheetsWebhookUrl();

  if (!url) {
    return {
      success: false,
      status: 'no_webhook',
      message: 'Google Sheets Webhook URL not configured. Go to Admin → Sheets Setup.',
    };
  }

  const payload = formatOrderPayload(order, marketerName);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const response = await fetch(url, {
      method: 'POST',
      // Use text/plain to avoid CORS preflight with Google Apps Script
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = { status: response.ok ? 'synced' : 'error', message: text };
    }

    if (result.status === 'synced') {
      return { success: true, status: 'synced', message: result.message || 'Synced.' };
    }
    if (result.status === 'duplicate') {
      return { success: true, status: 'duplicate', message: result.message || 'Duplicate prevented.' };
    }
    return { success: false, status: 'failed', message: result.message || 'Sync failed.' };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, status: 'failed', message: 'Sync timed out. Order is saved locally – retry later.' };
    }
    return { success: false, status: 'failed', message: `Sync error: ${err.message}` };
  }
};

/**
 * Tests the Apps Script connection.
 */
export const testSheetsConnection = async (webhookUrl) => {
  if (!webhookUrl) return { success: false, message: 'No URL provided.' };
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10000);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'testConnection' }),
      signal: controller.signal,
    });
    const text = await response.text();
    const result = JSON.parse(text);
    return { success: result.status === 'ok', message: result.message || 'Connected!' };
  } catch (err) {
    return { success: false, message: `Connection failed: ${err.message}` };
  }
};
