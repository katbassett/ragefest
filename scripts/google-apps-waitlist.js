/**
 * RageFest waitlist → Google Sheet
 *
 * SETUP
 * 1. Paste the ID of the target spreadsheet into SPREADSHEET_ID below.
 *    Grab it from the Sheet URL:
 *    docs.google.com/spreadsheets/d/<THIS_PART_IS_THE_ID>/edit
 * 2. Deploy → New deployment → Web app
 *      Execute as: Me
 *      Who has access: Anyone
 * 3. Open the /exec URL in a browser. The response names the spreadsheet it
 *    writes to, so you can confirm each deployment targets the right Sheet.
 *
 * Setting SPREADSHEET_ID explicitly matters when several deployments share this
 * code: a copied script project stays bound to the spreadsheet it was created
 * from, so getActiveSpreadsheet() can silently write to the wrong Sheet.
 */

const SPREADSHEET_ID = '';

// Leave blank to use the first tab
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
  try {
    const sheet = getSheet_();

    return json_({
      ok: true,
      service: 'ragefest-waitlist',
      spreadsheet: sheet.getParent().getName(),
      tab: sheet.getName(),
      rows: Math.max(sheet.getLastRow() - 1, 0),
    });
  } catch (err) {
    return json_({
      ok: false,
      service: 'ragefest-waitlist',
      error: String(err && err.message ? err.message : err),
    });
  }
}

function getSheet_() {
  const ss = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) {
    throw new Error(
      'No spreadsheet found. Set SPREADSHEET_ID, or open Apps Script from the Sheet via Extensions → Apps Script.',
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

  const values = sheet.getRange(2, 2, last - 1, 1).getValues();
  return values.some((row) => String(row[0]).trim().toLowerCase() === email);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
