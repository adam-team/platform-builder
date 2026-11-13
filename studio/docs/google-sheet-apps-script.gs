// Google Sheets → Extensions (Кеңейтімдер) → Apps Script → осы кодты ЕСКІ кодтың орнына толық қойыңыз.
// 1) SECRET-ті өз құпия сөзіңізге ауыстырыңыз (Vercel-дегі GOOGLE_SHEET_SECRET-пен бірдей болуы керек — бұрыннан
//    бапталған болса, өзгертпеңіз, тек осы файлдағы мәнді сол ескі құпия сөзге қойыңыз).
// 2) Deploy → Manage deployments → ✎ (Edit) → Version: New version → Deploy.
//    («Manage deployments» — бұрыннан бар веб-сілтеме сол күйінде қалады, Vercel-де ештеңе өзгертудің қажеті жоқ.)
//
// Бұл нұсқа бірнеше парақты (пайдаланушылар, курстар, сабақтар, жаңалықтар, қызметтер, төлемдер, тапсырмалар)
// қолдайды — әр парақ өз атауымен (sheet) және өз бағандарымен (headers) келеді, сервер жағынан анықталады.

const SECRET = 'МЫНА_ЖЕРГЕ_ӨЗ_ҚҰПИЯ_СӨЗІҢІЗДІ_ЖАЗЫҢЫЗ';

function doGet() {
  return out({ ok: true, message: 'Google кесте қосылған' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) return out({ ok: false, error: 'forbidden' });
    const headers = body.headers || [];
    const sheet = prepareSheet(body.sheet || 'Пайдаланушылар', headers);
    const rows = body.rows || [];

    if (body.action === 'replaceAll') {
      const last = sheet.getLastRow();
      if (last > 1) sheet.getRange(2, 1, last - 1, headers.length).clearContent();
      if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows.map(function (r) { return toArray(r, headers); }));
    } else {
      const last = sheet.getLastRow();
      const keys = last > 1 ? sheet.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]).toLowerCase(); }) : [];
      rows.forEach(function (row) {
        const key = String(row[headers[0]] || '').toLowerCase();
        if (!key) return;
        const idx = keys.indexOf(key);
        if (idx === -1) {
          sheet.appendRow(toArray(row, headers));
          keys.push(key);
        } else {
          const range = sheet.getRange(idx + 2, 1, 1, headers.length);
          const current = range.getValues()[0];
          headers.forEach(function (h, i) {
            if (row[h] !== undefined && row[h] !== null) current[i] = row[h];
          });
          range.setValues([current]);
        }
      });
    }
    return out({ ok: true, count: rows.length });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function prepareSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const firstRow = sheet.getLastRow() > 0 ? sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0] : [];
  const headersChanged = headers.length && firstRow.join('|') !== headers.join('|');
  if (sheet.getLastRow() === 0 || headersChanged) {
    if (headersChanged && sheet.getLastRow() > 0) sheet.clear(); // бағандар жиынтығы өзгерсе (жаңа өріс қосылса) — таза бастаймыз
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#e4f3ea');
    sheet.setFrozenRows(1);
  }
  // бәрі мәтін болсын: «+7...» телефон немесе «=» деп басталатын құпия сөз формула болып кетпейді
  sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2), headers.length).setNumberFormat('@');
  return sheet;
}

function toArray(row, headers) {
  return headers.map(function (h) { return row[h] === undefined || row[h] === null ? '' : row[h]; });
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
