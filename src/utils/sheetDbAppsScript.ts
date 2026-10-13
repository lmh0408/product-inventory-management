/** Google Apps Script 웹앱 소스. 시트 [확장 프로그램] → [Apps Script]에 붙여넣고 웹 앱으로 배포합니다. */
export const SHEET_DB_APPS_SCRIPT = `function doGet() {
  return json_({ ok: true, service: "SheetStock DB", version: 7 });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    lock.waitLock(30000);
    locked = true;
    if (!e || !e.postData || !e.postData.contents) {
      return json_({
        ok: false,
        version: 7,
        error: "POST 본문이 없습니다. 웹 앱 액세스를 모든 사용자로 다시 배포했는지 확인하세요.",
      });
    }
    var payload = JSON.parse(e.postData.contents);
    var ss = payload.sheetId
      ? SpreadsheetApp.openById(payload.sheetId)
      : SpreadsheetApp.getActiveSpreadsheet();
    var result;
    if (payload.action === "SYNC_APP_DATA") {
      result = replaceLedgers_(ss, payload.replacements || [], payload.updates || []);
    } else if (payload.action === "DELETE_MOVEMENTS") {
      result = deleteRows_(ss, payload.deletes || []);
    } else if ((payload.appends && payload.appends.length) || (payload.updates && payload.updates.length)) {
      result = applyWrites_(ss, payload.appends || [], payload.updates || []);
    } else {
      throw new Error("반영할 시트 변경사항이 없습니다. 앱의 Apps Script 코드를 최신 버전으로 다시 배포하세요.");
    }
    SpreadsheetApp.flush();
    return json_({
      ok: true,
      version: 7,
      appendedCount: result.appendedCount || 0,
      updatedCount: result.updatedCount || 0,
      deletedCount: result.deletedCount || 0,
    });
  } catch (err) {
    return json_({
      ok: false,
      version: 7,
      error: String(err && err.message ? err.message : err),
    });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function applyWrites_(ss, appends, updates) {
  var appendedCount = 0;
  for (var i = 0; i < appends.length; i++) {
    var a = appends[i];
    var sh = ss.getSheetByName(a.sheetName);
    if (!sh) throw new Error("탭을 찾지 못했습니다: " + a.sheetName);
    var values = a.values || [];
    if (values.length === 0) continue;
    if (a.insertBefore) sh.insertRowsBefore(a.row, 1);
    sh.getRange(a.row, 1, 1, values.length).setValues([values]);
    appendedCount++;
  }
  var updatedCount = applyUpdates_(ss, updates);
  return { appendedCount: appendedCount, updatedCount: updatedCount, deletedCount: 0 };
}

function applyUpdates_(ss, updates) {
  var groups = {};
  for (var i = 0; i < updates.length; i++) {
    var update = updates[i];
    var key = update.sheetName + "\\n" + update.row;
    if (!groups[key]) groups[key] = [];
    groups[key].push(update);
  }
  var keys = Object.keys(groups);
  var updatedCount = 0;
  for (var j = 0; j < keys.length; j++) {
    var rowUpdates = groups[keys[j]].sort(function(a, b) { return a.col - b.col; });
    var sheet = ss.getSheetByName(rowUpdates[0].sheetName);
    if (!sheet) throw new Error("탭을 찾지 못했습니다: " + rowUpdates[0].sheetName);
    var segment = [];
    for (var k = 0; k < rowUpdates.length; k++) {
      if (segment.length && rowUpdates[k].col !== segment[segment.length - 1].col + 1) {
        writeUpdateSegment_(sheet, segment);
        updatedCount += segment.length;
        segment = [];
      }
      segment.push(rowUpdates[k]);
    }
    if (segment.length) {
      writeUpdateSegment_(sheet, segment);
      updatedCount += segment.length;
    }
  }
  return updatedCount;
}

function writeUpdateSegment_(sheet, segment) {
  sheet
    .getRange(segment[0].row, segment[0].col, 1, segment.length)
    .setValues([segment.map(function(update) { return update.value; })]);
}

function replaceLedgers_(ss, replacements, updates) {
  if (!replacements.length) throw new Error("동기화할 원장 탭 정보가 없습니다.");
  var appendedCount = 0;
  var deletedCount = 0;
  for (var i = 0; i < replacements.length; i++) {
    var replacement = replacements[i];
    var sheet = ss.getSheetByName(replacement.sheetName);
    if (!sheet) throw new Error("원장 탭을 찾지 못했습니다: " + replacement.sheetName);
    var clearRowCount = Number(replacement.clearRowCount || 0);
    var columnCount = Number(replacement.columnCount || 0);
    var formulaRow = Number(replacement.formulaRow || 0);
    var requiredRows = (replacement.values || []).length;
    if (formulaRow > 0 && requiredRows > clearRowCount) {
      sheet.insertRowsBefore(formulaRow, requiredRows - clearRowCount);
    }
    if (clearRowCount > 0 && columnCount > 0) {
      sheet.getRange(replacement.startRow, 1, clearRowCount, columnCount).clearContent();
      deletedCount += clearRowCount;
    }
  }
  for (var j = 0; j < replacements.length; j++) {
    var write = replacements[j];
    var target = ss.getSheetByName(write.sheetName);
    if (!target) throw new Error("원장 탭을 찾지 못했습니다: " + write.sheetName);
    var values = write.values || [];
    if (values.length > 0) {
      target.getRange(write.startRow, 1, values.length, write.columnCount).setValues(values);
      appendedCount += values.length;
    }
  }
  var stockResult = applyWrites_(ss, [], updates);
  return {
    appendedCount: appendedCount,
    updatedCount: stockResult.updatedCount,
    deletedCount: deletedCount,
  };
}

function deleteRows_(ss, deletes) {
  if (!deletes.length) throw new Error("삭제할 시트 행 정보가 없습니다. 시트를 다시 불러오세요.");
  var resolved = [];
  var seen = {};
  var contexts = {};
  for (var i = 0; i < deletes.length; i++) {
    var item = deletes[i];
    var sheet = ss.getSheetByName(item.sheetName);
    if (!sheet) throw new Error("삭제할 탭을 찾지 못했습니다: " + item.sheetName);
    if (!contexts[item.sheetName]) {
      var meta = inspectLedger_(sheet);
      if (!meta) throw new Error("시트의 입출고 헤더를 찾지 못했습니다: " + sheet.getName());
      var dataRange = sheet.getDataRange();
      contexts[item.sheetName] = {
        sheet: sheet,
        meta: meta,
        displayRows: dataRange.getDisplayValues(),
        valueRows: dataRange.getValues(),
      };
    }
    var row = resolveDeleteRow_(contexts[item.sheetName], item);
    var key = item.sheetName + ":" + row;
    if (seen[key]) {
      throw new Error("동일한 시트 행이 중복 선택되었습니다. 시트를 다시 불러오세요.");
    }
    seen[key] = true;
    resolved.push({ sheetName: item.sheetName, row: row });
  }
  resolved.sort(function(a, b) {
    if (a.sheetName === b.sheetName) return Number(b.row) - Number(a.row);
    return String(a.sheetName).localeCompare(String(b.sheetName));
  });
  var deletedCount = 0;
  for (var j = 0; j < resolved.length; j++) {
    var deleteItem = resolved[j];
    var deleteSheet = ss.getSheetByName(deleteItem.sheetName);
    if (!deleteSheet) throw new Error("삭제할 탭을 찾지 못했습니다: " + deleteItem.sheetName);
    deleteSheet.deleteRow(Number(deleteItem.row));
    deletedCount++;
  }
  return { appendedCount: 0, updatedCount: 0, deletedCount: deletedCount };
}

function resolveDeleteRow_(context, item) {
  var preferredRow = Number(item.row);
  if (
    Number.isInteger(preferredRow) &&
    preferredRow >= 1 &&
    preferredRow <= context.displayRows.length &&
    rowMatchesDelete_(context, preferredRow, item)
  ) {
    return preferredRow;
  }
  var matches = [];
  for (var row = context.meta.headerRow + 1; row <= context.displayRows.length; row++) {
    if (rowMatchesDelete_(context, row, item)) matches.push(row);
  }
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error("동일한 조건의 내역이 여러 건이라 삭제 대상을 특정할 수 없습니다. 시트를 다시 불러오세요.");
  }
  throw new Error("삭제할 내역을 현재 시트에서 찾지 못했습니다. 시트를 다시 불러오세요.");
}

function rowMatchesDelete_(context, row, item) {
  var display = context.displayRows[row - 1] || [];
  var values = context.valueRows[row - 1] || [];
  var meta = context.meta;
  if (item.date && !rowHasDate_(values, item.date)) return false;
  var typeLabel = String(item.typeLabel || "").trim();
  if (typeLabel && String(display[meta.typeCol - 1] || "").indexOf(typeLabel) < 0) return false;
  var expectedDescription = String(item.description || "").trim();
  if (
    expectedDescription &&
    String(display[meta.descCol - 1] || "").trim() !== expectedDescription
  ) {
    return false;
  }
  var items = item.items || [];
  for (var i = 0; i < items.length; i++) {
    var col = meta.productCols[items[i].productId];
    if (!col) return false;
    var actual = Number(String(display[col - 1] || "0").replace(/,/g, ""));
    if (Math.abs(actual) !== Math.abs(Number(items[i].quantity || 0))) return false;
  }
  return true;
}

function rowHasDate_(values, expectedDate) {
  var expected = String(expectedDate).match(/\\d+/g) || [];
  if (expected.length < 3) return false;
  for (var i = 0; i < values.length; i++) {
    var value = values[i];
    if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
      if (Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd") === expectedDate) {
        return true;
      }
    }
    var parts = String(value || "").match(/\\d+/g) || [];
    if (
      parts.length >= 3 &&
      Number(parts[0]) === Number(expected[0]) &&
      Number(parts[1]) === Number(expected[1]) &&
      Number(parts[2]) === Number(expected[2])
    ) {
      return true;
    }
  }
  return false;
}

function appendLedgerRows_(ss, movement) {
  var type = movement.type;
  var items = movement.items || [];
  var desc = movement.description || "";
  var date = movement.date || "";
  var partner = movement.partnerOrRecipient || "";
  if (type === "TRANSFER") {
    writeLedger_(ss, movement.fromLocation, date, "출고", desc, items, -1, partner);
    writeLedger_(ss, movement.toLocation, date, "입고", desc, items, 1, partner);
    return;
  }
  var loc = movement.locationId || (type === "IN" ? movement.toLocation : movement.fromLocation);
  writeLedger_(ss, loc, date, type === "IN" ? "입고" : "출고", desc, items, type === "IN" ? 1 : -1, partner);
}

function writeLedger_(ss, locationId, date, typeLabel, desc, items, sign, partner) {
  if (!locationId) return;
  var sheet = findLocationSheet_(ss, locationId);
  if (!sheet) return;
  var meta = inspectLedger_(sheet);
  if (!meta) return;
  var rowValues = [];
  var lastCol = Math.max(sheet.getLastColumn(), 3);
  for (var c = 1; c <= lastCol; c++) rowValues.push("");
  rowValues[meta.dateCol - 1] = date;
  rowValues[meta.typeCol - 1] = typeLabel;
  rowValues[meta.descCol - 1] = desc;
  if (meta.partnerCol) rowValues[meta.partnerCol - 1] = partner || "";
  for (var i = 0; i < items.length; i++) {
    var col = meta.productCols[items[i].productId];
    if (col) rowValues[col - 1] = sign * Number(items[i].quantity || 0);
  }
  sheet.getRange(meta.appendRow, 1, 1, rowValues.length).setValues([rowValues]);
}

function inspectLedger_(sheet) {
  var range = sheet.getDataRange();
  var values = range.getDisplayValues();
  var headerRow = -1;
  var header = [];
  for (var r = 0; r < Math.min(values.length, 15); r++) {
    var joined = values[r].join(" ");
    if (
      (/날짜|일자/.test(joined) && /입출고|구분/.test(joined)) ||
      (/입출고|구분/.test(joined) && /내역|납품/.test(joined))
    ) {
      headerRow = r;
      header = values[r];
      break;
    }
  }
  if (headerRow < 0) return null;
  var dateCol = 1;
  var typeCol = 2;
  var descCol = 3;
  var partnerCol = 0;
  var productCols = {};
  for (var c = 0; c < header.length; c++) {
    var h = String(header[c] || "");
    if (/날짜|일자/.test(h)) dateCol = c + 1;
    if (/입출고|구분/.test(h)) typeCol = c + 1;
    if (/내역|내용/.test(h)) descCol = c + 1;
    if (/납품|거래|상대/.test(h)) partnerCol = c + 1;
    var pid = matchProduct_(h);
    if (pid) productCols[pid] = c + 1;
  }
  var last = lastFilledRow_(values, headerRow + 1, dateCol - 1);
  return { headerRow: headerRow + 1, dateCol: dateCol, typeCol: typeCol, descCol: descCol, partnerCol: partnerCol, productCols: productCols, appendRow: last + 1 };
}

function writeDashboardAndOnHand_(ss, stocks) {
  var dash = findDashboard_(ss);
  if (dash) writeMatrix_(dash, stocks, true);
  var ids = ["lucciem", "seil", "ijin", "etc"];
  for (var i = 0; i < ids.length; i++) {
    var locSheet = findLocationSheet_(ss, ids[i]);
    if (locSheet) writeOnHand_(locSheet, stocks, ids[i]);
  }
}

function writeMatrix_(sheet, stocks, isDashboard) {
  var values = sheet.getDataRange().getDisplayValues();
  var headerRow = -1;
  var header = [];
  for (var r = 0; r < Math.min(values.length, 12); r++) {
    if (String(values[r][0] || "").indexOf("장소") >= 0 || countProductHeaders_(values[r]) >= 4) {
      headerRow = r;
      header = values[r];
      break;
    }
  }
  if (headerRow < 0) return;
  var locCol = 1;
  var remarksCol = -1;
  var productCols = {};
  for (var c = 0; c < header.length; c++) {
    var h = String(header[c] || "");
    if (/장소|거점/.test(h)) locCol = c + 1;
    if (/비고|메모/.test(h)) remarksCol = c + 1;
    var pid = matchProduct_(h);
    if (pid) productCols[pid] = c + 1;
  }
  var totals = {};
  for (var r2 = headerRow + 1; r2 < values.length; r2++) {
    var label = String(values[r2][locCol - 1] || "");
    if (/합계|총계/.test(label)) {
      writeStockRow_(sheet, r2 + 1, productCols, -1, totals, "");
      break;
    }
    var locId = matchLocation_(label);
    if (!locId) continue;
    var stock = findStock_(stocks, locId);
    if (!stock) continue;
    writeStockRow_(sheet, r2 + 1, productCols, remarksCol, stock.quantities || {}, stock.remarks || "");
    mergeTotals_(totals, stock.quantities || {});
  }
}

function writeOnHand_(sheet, stocks, locationId) {
  var values = sheet.getDataRange().getDisplayValues();
  var onHandRow = -1;
  var headerRow = -1;
  var header = [];
  for (var r = 0; r < Math.min(values.length, 8); r++) {
    var a = String(values[r][0] || "");
    if (/현재재고|현재\\s*재고|현\\s*재고/.test(a)) onHandRow = r;
    if (/날짜|일자/.test(values[r].join(" ")) && /입출고|구분/.test(values[r].join(" "))) {
      headerRow = r;
      header = values[r];
    }
  }
  if (onHandRow < 0 || headerRow < 0) return;
  var productCols = {};
  for (var c = 0; c < header.length; c++) {
    var pid = matchProduct_(header[c]);
    if (pid) productCols[pid] = c + 1;
  }
  var stock = findStock_(stocks, locationId);
  if (!stock) return;
  writeStockRow_(sheet, onHandRow + 1, productCols, -1, stock.quantities || {}, "");
}

function writeStockRow_(sheet, row1, productCols, remarksCol, quantities, remarks) {
  var pids = Object.keys(productCols);
  for (var i = 0; i < pids.length; i++) {
    var col = productCols[pids[i]];
    var qty = Number(quantities[pids[i]] || 0);
    sheet.getRange(row1, col).setValue(qty);
  }
  if (remarksCol > 0 && remarks !== undefined) {
    sheet.getRange(row1, remarksCol).setValue(remarks);
  }
}

function findStock_(stocks, locationId) {
  for (var i = 0; i < stocks.length; i++) {
    if (stocks[i].locationId === locationId) return stocks[i];
  }
  return null;
}

function mergeTotals_(into, quantities) {
  var keys = Object.keys(quantities);
  for (var i = 0; i < keys.length; i++) {
    into[keys[i]] = Number(into[keys[i]] || 0) + Number(quantities[keys[i]] || 0);
  }
}

function lastFilledRow_(values, startIdx, colIdx) {
  for (var r = values.length - 1; r >= startIdx; r--) {
    if (String(values[r][colIdx] || "").trim() !== "") return r + 1;
  }
  return startIdx + 1;
}

function countProductHeaders_(row) {
  var n = 0;
  for (var i = 0; i < row.length; i++) if (matchProduct_(row[i])) n++;
  return n;
}

function findDashboard_(ss) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var n = sheets[i].getName().trim();
    if (/^\\d{4}/.test(n) || /\\.org$/i.test(n)) continue;
    if (n.toLowerCase() === "dashboard" || n === "보관함 Dashboard") return sheets[i];
  }
  return ss.getSheets()[0];
}

function findLocationSheet_(ss, locationId) {
  var exact = { lucciem: "루씨엠-오름차순", seil: "세일정밀공업-오름차순", ijin: "아이진-오름차순", etc: "etc-오름차순" };
  var want = exact[locationId];
  return want ? ss.getSheetByName(want) : null;
}

function matchLocation_(label) {
  var n = String(label).replace(/\\s+/g, "");
  if (n.indexOf("루씨엠") >= 0 || n === "사무실") return "lucciem";
  if (n.indexOf("세일정밀") >= 0) return "seil";
  if (n.indexOf("아이진") >= 0) return "ijin";
  if (n.toLowerCase() === "etc" || n.toLowerCase().indexOf("etc") === 0) return "etc";
  return null;
}

function matchProduct_(label) {
  var n = String(label || "").toLowerCase().replace(/\\s+/g, "").replace(/[()[\\]{}]/g, "").replace(/보관함/g, "");
  if (!n) return null;
  var map = [
    ["smart_top_eng", ["smart상단영문", "영문상단"]],
    ["std_top_samsung", ["일반상단삼성", "삼성상단"]],
    ["std_bottom_samsung", ["일반하단삼성", "삼성하단"]],
    ["smart_top", ["smart상단", "스마트상단"]],
    ["smart_bottom", ["smart하단", "스마트하단"]],
    ["std_top", ["일반상단"]],
    ["std_bottom", ["일반하단"]],
    ["forklift_bag", ["지게가방"]],
    ["semi_outdoor", ["세미아웃도어", "준옥외"]],
    ["terminal_board", ["단말기보드", "단말기", "전장보드"]],
    ["outdoor", ["옥외"]],
    ["mobile", ["이동"]]
  ];
  for (var i = 0; i < map.length; i++) {
    var aliases = map[i][1];
    for (var j = 0; j < aliases.length; j++) {
      if (n === aliases[j] || n.indexOf(aliases[j]) >= 0) return map[i][0];
    }
  }
  return null;
}

function grantSheets() {
  var ss = SpreadsheetApp.openById("1cenXoa-RZoU_P_CYXkgPJ5N5E9QGeDMCyBRXDa4Jp00");
  Logger.log(ss.getName());
}
`;
