var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api-src/google-sheet/[sheetId].ts
var sheetId_exports = {};
__export(sheetId_exports, {
  default: () => handler
});
module.exports = __toCommonJS(sheetId_exports);

// server/googleSheetProxy.ts
var SHEET_ID_PATTERN = /^[a-zA-Z0-9-_]{20,}$/;
function buildFreshExportUrl(sheetId) {
  const cacheBust = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx&_t=${encodeURIComponent(cacheBust)}`;
}
async function handleGoogleSheetExport(rawSheetId) {
  const sheetId = (rawSheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i)?.[1] || rawSheetId).trim();
  if (!SHEET_ID_PATTERN.test(sheetId)) {
    return {
      status: 400,
      json: { error: "\uC62C\uBC14\uB978 \uAD6C\uAE00 \uC2DC\uD2B8 URL \uB610\uB294 ID\uAC00 \uC544\uB2D9\uB2C8\uB2E4." }
    };
  }
  const exportUrl = buildFreshExportUrl(sheetId);
  const response = await fetch(exportUrl, {
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(25e3),
    headers: {
      "User-Agent": "Mozilla/5.0 SheetStockSync/1.0",
      "Cache-Control": "no-cache, no-store, max-age=0",
      Pragma: "no-cache"
    }
  });
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || contentType.includes("text/html")) {
    return {
      status: response.status === 404 ? 404 : 403,
      json: {
        error: '\uC2DC\uD2B8\uC5D0 \uC811\uADFC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uAD6C\uAE00 \uC2DC\uD2B8 [\uACF5\uC720]\uC5D0\uC11C "\uB9C1\uD06C\uAC00 \uC788\uB294 \uBAA8\uB4E0 \uC0AC\uC6A9\uC790"\uB97C \uBDF0\uC5B4 \uC774\uC0C1\uC73C\uB85C \uC124\uC815\uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.'
      }
    };
  }
  return {
    status: 200,
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  };
}
function exportErrorResult(error) {
  return {
    status: 502,
    json: {
      error: error instanceof Error ? `\uC2DC\uD2B8\uB97C \uAC00\uC838\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4: ${error.message}` : "\uC2DC\uD2B8\uB97C \uAC00\uC838\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
    }
  };
}

// api-src/google-sheet/[sheetId].ts
async function handler(req, res) {
  try {
    if (!res.headersSent) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    let sheetId = "";
    const raw = req.query?.sheetId;
    if (Array.isArray(raw)) {
      sheetId = raw[0] || "";
    } else if (typeof raw === "string") {
      sheetId = raw;
    }
    if (!sheetId && req.url) {
      try {
        const parsed = new URL(req.url, "http://localhost");
        sheetId = parsed.searchParams.get("sheetId") || "";
        if (!sheetId) {
          const segments = parsed.pathname.split("/").filter(Boolean);
          const last = segments.pop() || "";
          if (last && last !== "[sheetId]" && last !== "google-sheet") {
            sheetId = last;
          }
        }
      } catch {
        const segments = (req.url || "").split("?")[0].split("/").filter(Boolean);
        const last = segments.pop() || "";
        if (last && last !== "[sheetId]" && last !== "google-sheet") {
          sheetId = last;
        }
      }
    }
    sheetId = decodeURIComponent(sheetId || "").trim();
    if (!sheetId) {
      sheetId = "1cenXoa-RZoU_P_CYXkgPJ5N5E9QGeDMCyBRXDa4Jp00";
    }
    const result = await handleGoogleSheetExport(sheetId);
    if ("buffer" in result) {
      res.statusCode = result.status;
      res.setHeader("Content-Type", result.contentType);
      res.end(result.buffer);
      return;
    }
    res.statusCode = result.status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(result.json));
  } catch (error) {
    const result = exportErrorResult(error);
    if (!res.headersSent) {
      res.statusCode = result.status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(result.json));
    }
  }
}

const _h = module.exports.default || module.exports;
module.exports = _h;
module.exports.default = _h;
