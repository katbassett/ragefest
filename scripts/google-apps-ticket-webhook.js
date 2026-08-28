/**
 * Loop1 / pretix order webhook → Google Sheet + Signal waitlist
 *
 * SETUP
 * 1. Paste the target spreadsheet ID into SPREADSHEET_ID below.
 * 2. Script properties (Project settings → Script properties):
 *      LOOP1_API_TOKEN   — pretix/Loop1 API token with order read access
 *      WEBHOOK_SECRET    — optional shared secret; pretix webhook URL becomes
 *                          https://script.google.com/.../exec?secret=YOUR_SECRET
 * 3. Deploy → New deployment → Web app
 *      Execute as: Me
 *      Who has access: Anyone
 * 4. In Loop1 organizer settings → Webhooks:
 *      URL: your /exec URL (with ?secret= if configured)
 *      Events: pretix.event.order.placed and pretix.event.order.paid
 * 5. Enable Loop1 plugin “Redirection from order page” and set base URL to:
 *      https://ragefestspi.com/tickets/thank-you/
 *    Buyers land on the branded thank-you page after checkout.
 *
 * The webhook only receives order codes. This script fetches the order from
 * Loop1, logs it, and appends the buyer email to the Signal waitlist tab.
 */

const SPREADSHEET_ID = '';
const ORDERS_SHEET_NAME = 'Purchases';
const WAITLIST_SHEET_NAME = '';
const LOOP1_API_BASE = 'https://loop1tickets.com/api/v1';
const ORGANIZER = 'Ragefest';
const EVENT_SLUG = 'Ragefest2027';

function doPost(e) {
  try {
    if (!verifySecret_(e)) {
      return json_({ ok: false, error: 'Unauthorized' }, 401);
    }

    const raw = (e && e.postData && e.postData.contents) || '{}';
    const payload = JSON.parse(raw);
    const action = String(payload.action || '');
    const orderCode = String(payload.code || '').trim();

    if (!orderCode) {
      return json_({ ok: false, error: 'Missing order code' });
    }

    if (
      action !== 'pretix.event.order.placed' &&
      action !== 'pretix.event.order.paid'
    ) {
      return json_({ ok: true, ignored: true, action: action });
    }

    const order = fetchOrder_(orderCode);
    const email = String(order.email || '')
      .trim()
      .toLowerCase();
    const total = order.total || '';
    const status = String(order.status || '');

    logPurchase_({
      orderCode: orderCode,
      email: email,
      total: total,
      status: status,
      action: action,
    });

    if (email) {
      appendWaitlistEmail_(email, 'purchase_webhook');
    }

    return json_({ ok: true, order: orderCode, email: email || null });
  } catch (err) {
    return json_({
      ok: false,
      error: String(err && err.message ? err.message : err),
    });
  }
}

function doGet(e) {
  try {
    if (!verifySecret_(e)) {
      return json_({ ok: false, error: 'Unauthorized' }, 401);
    }

    return json_({
      ok: true,
      service: 'ragefest-ticket-webhook',
      organizer: ORGANIZER,
      event: EVENT_SLUG,
      ordersSheet: ORDERS_SHEET_NAME,
    });
  } catch (err) {
    return json_({
      ok: false,
      error: String(err && err.message ? err.message : err),
    });
  }
}

function verifySecret_(e) {
  const configured = PropertiesService.getScriptProperties().getProperty(
    'WEBHOOK_SECRET',
  );
  if (!configured) return true;

  const supplied =
    (e && e.parameter && e.parameter.secret) ||
    (e && e.postData && e.postData.type && e.parameter && e.parameter.secret);

  return String(supplied || '') === configured;
}

function fetchOrder_(orderCode) {
  const token = PropertiesService.getScriptProperties().getProperty(
    'LOOP1_API_TOKEN',
  );
  if (!token) {
    throw new Error('Missing LOOP1_API_TOKEN script property.');
  }

  const url =
    LOOP1_API_BASE +
    '/organizers/' +
    encodeURIComponent(ORGANIZER) +
    '/events/' +
    encodeURIComponent(EVENT_SLUG) +
    '/orders/' +
    encodeURIComponent(orderCode) +
    '/';

  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      Authorization: 'Token ' + token,
    },
  });

  const status = response.getResponseCode();
  const body = response.getContentText();

  if (status < 200 || status >= 300) {
    throw new Error('Loop1 order fetch failed (' + status + '): ' + body);
  }

  return JSON.parse(body);
}

function logPurchase_(entry) {
  const sheet = getSheet_(ORDERS_SHEET_NAME, [
    'Timestamp',
    'Order Code',
    'Email',
    'Total',
    'Status',
    'Action',
  ]);

  sheet.appendRow([
    new Date().toISOString(),
    entry.orderCode,
    entry.email,
    entry.total,
    entry.status,
    entry.action,
  ]);
}

function appendWaitlistEmail_(email, source) {
  const sheet = getSheet_(WAITLIST_SHEET_NAME, [
    'Timestamp',
    'Email',
    'Source',
    'User Agent',
  ]);

  if (emailExists_(sheet, email)) return;

  sheet.appendRow([new Date().toISOString(), email, source, 'loop1-webhook']);
}

function getSheet_(preferredName, headerRow) {
  const ss = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) {
    throw new Error(
      'No spreadsheet found. Set SPREADSHEET_ID or bind this script to a Sheet.',
    );
  }

  let sheet = preferredName ? ss.getSheetByName(preferredName) : null;
  if (!sheet) sheet = ss.getSheets()[0];

  if (sheet.getLastRow() === 0 && headerRow && headerRow.length) {
    sheet.appendRow(headerRow);
  }

  return sheet;
}

function emailExists_(sheet, email) {
  const last = sheet.getLastRow();
  if (last < 2) return false;

  const values = sheet.getRange(2, 2, last - 1, 1).getValues();
  return values.some(function (row) {
    return String(row[0]).trim().toLowerCase() === email;
  });
}

function json_(obj, status) {
  const output = ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );

  if (status) {
    // Apps Script WebApp cannot set arbitrary status codes directly in all modes.
    return output;
  }

  return output;
}
