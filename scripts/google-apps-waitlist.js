/**
 * RageFest waitlist → Google Sheet
 *
 * IMPORTANT DEPLOY SETTINGS (this is why the sheet wasn't updating):
 * Deploy → Manage deployments → Edit (pencil) OR New deployment
 *   Type: Web app
 *   Execute as: Me
 *   Who has access: Anyone   ← must be "Anyone", NOT "Anyone with a Google account"
 * After changing code OR access, create a NEW version and Deploy.
 * Then copy the /exec URL into .env as PUBLIC_WAITLIST_WEBAPP_URL
 *
 * Setup:
 * 1. Open your Sheet → Extensions → Apps Script (must be bound to the sheet)
 * 2. Paste this file, Save
 * 3. Deploy as above
 * 4. Test the URL in an incognito window — you should see:
 *    {"ok":true,"service":"ragefest-waitlist"}
 *    If you see "You need access", the deployment access is still wrong.
 */

// Leave blank to always use the first tab
const SHEET_NAME = '';

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '{}';
    const data = JSON.parse(raw);
    const email = String(data.email || '')
      .trim()
      .toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json_({ ok: false, error: 'Invalid email' });
    }

    const sheet = getSheet_();
    ensureHeader_(sheet);

    const stamp = new Date().toISOString();
    const source = String(data.source || 'signal');
    const ua = String(data.userAgent || '');

    if (emailExists_(sheet, email)) {
      return json_({ ok: true, duplicate: true });
    }

    sheet.appendRow([stamp, email, source, ua]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return json_({ ok: true, service: 'ragefest-waitlist' });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      'No active spreadsheet. Open Apps Script from the Sheet via Extensions → Apps Script.',
    );
  }
  if (SHEET_NAME) {
    const named = ss.getSheetByName(SHEET_NAME);
    if (named) return named;
  }
  return ss.getSheets()[0];
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Email', 'Source', 'User Agent']);
  }
}

function emailExists_(sheet, email) {
  const last = sheet.getLastRow();
  if (last < 2) return false;
  const values = sheet.getRange(2, 2, last, 2).getValues();
  return values.some((row) => String(row[0]).trim().toLowerCase() === email);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
