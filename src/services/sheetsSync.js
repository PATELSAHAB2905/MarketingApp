// Google Sheets CSV Exporter & Webhook Sync Service for Patel Sahab Spices

export const convertToCSV = (data) => {
  if (!data || !data.length) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      if (val === null || val === undefined) return '""';
      const escaped = ('' + val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

export const downloadCSV = (filename, csvContent) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const syncToGoogleSheetsWebhook = async (webhookUrl, tableName, payload) => {
  if (!webhookUrl) {
    return { success: false, message: 'Google Sheets Webhook URL is not configured' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: tableName,
        timestamp: new Date().toISOString(),
        data: payload,
      }),
    });
    if (response.ok) {
      return { success: true, message: `Successfully synced ${tableName} to Google Sheets` };
    } else {
      return { success: false, message: `Google Sheets sync returned HTTP ${response.status}` };
    }
  } catch (err) {
    return { success: false, message: `Webhook error: ${err.message}` };
  }
};
