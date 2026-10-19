// server/app.ts
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

// server/googleSheetProxy.ts
import * as XLSX5 from "xlsx";

// src/utils/googleSheetMutate.ts
import * as XLSX3 from "xlsx";

// src/data/initialData.ts
var LOCATIONS = [
  {
    id: "lucciem",
    name: "\uB8E8\uC528\uC5E0 (\uBCF8\uC0AC/\uC0AC\uBB34\uC2E4)",
    shortName: "\uB8E8\uC528\uC5E0",
    type: "headquarter",
    description: "\uBCF8\uC0AC \uC7AC\uACE0 \uBC0F \uCD9C\uACE0/\uB0A9\uD488 \uAC70\uC810",
    color: "emerald"
  },
  {
    id: "seil",
    name: "\uC138\uC77C\uC815\uBC00\uACF5\uC5C5 (\uC81C\uC791/\uBCF4\uAD00)",
    shortName: "\uC138\uC77C\uC815\uBC00\uACF5\uC5C5",
    type: "manufacturing",
    description: "\uCF00\uC774\uC2A4 \uC81C\uC791 \uBC0F \uBA54\uC778 \uBCF4\uAD00 \uAC70\uC810",
    color: "indigo"
  },
  {
    id: "ijin",
    name: "\uC544\uC774\uC9C4 (\uD611\uB825\uC0AC)",
    shortName: "\uC544\uC774\uC9C4",
    type: "partner",
    description: "\uBCF4\uAD00\uD568 \uC81C\uC791 \uD611\uB825 \uAC70\uC810",
    color: "amber"
  },
  {
    id: "etc",
    name: "ETC",
    shortName: "ETC",
    type: "partner",
    description: "\uAE30\uD0C0 \uC7AC\uACE0 \uAD00\uB9AC \uAC70\uC810",
    color: "blue"
  }
];
var PRODUCTS = [
  {
    id: "smart_top",
    name: "Smart \uC0C1\uB2E8",
    category: "Smart AED",
    unit: "",
    defaultSupplier: "seil",
    defaultMinThreshold: 20,
    moq: 20,
    unitCostEstimate: 14e4,
    description: "Smart AED \uBCF4\uAD00\uD568 \uC0C1\uB2E8 \uD30C\uD2B8 (IoT \uBAA8\uB4C8 \uBC0F \uC804\uC7A5 \uACB0\uD569 \uC870\uB9BD \uD544\uC694)",
    requiresAssembly: true
  },
  {
    id: "smart_bottom",
    name: "Smart \uD558\uB2E8",
    category: "Smart AED",
    unit: "",
    defaultSupplier: "seil",
    defaultMinThreshold: 20,
    moq: 20,
    unitCostEstimate: 12e4,
    description: "Smart AED \uBCF4\uAD00\uD568 \uD558\uB2E8 \uC2A4\uD0E0\uB4DC \uD30C\uD2B8",
    requiresAssembly: false
  },
  {
    id: "smart_top_eng",
    name: "Smart \uC0C1\uB2E8(\uC601\uBB38)",
    category: "Smart AED",
    unit: "",
    defaultSupplier: "seil",
    defaultMinThreshold: 5,
    moq: 10,
    unitCostEstimate: 145e3,
    description: "\uD574\uC678/\uD2B9\uC218 \uC218\uCD9C\uC6A9 \uC601\uBB38 \uD45C\uAE30 \uC2A4\uB9C8\uD2B8 \uC0C1\uB2E8 (\uCD94\uAC00 \uC870\uB9BD \uD544\uC694)",
    requiresAssembly: true
  },
  {
    id: "std_top",
    name: "\uC77C\uBC18 \uC0C1\uB2E8",
    category: "\uC77C\uBC18\uBCF4\uAD00\uD568",
    unit: "",
    defaultSupplier: "seil",
    defaultMinThreshold: 5,
    moq: 10,
    unitCostEstimate: 95e3,
    description: "\uD45C\uC900\uD615 \uC77C\uBC18\uBCF4\uAD00\uD568 \uC0C1\uB2E8 (\uB3C4\uC5B4 \uBC0F \uAE30\uAD6C \uC870\uB9BD \uD544\uC694)",
    requiresAssembly: true
  },
  {
    id: "std_bottom",
    name: "\uC77C\uBC18 \uD558\uB2E8",
    category: "\uC77C\uBC18\uBCF4\uAD00\uD568",
    unit: "",
    defaultSupplier: "seil",
    defaultMinThreshold: 10,
    moq: 10,
    unitCostEstimate: 85e3,
    description: "\uD45C\uC900\uD615 \uC77C\uBC18\uBCF4\uAD00\uD568 \uD558\uB2E8",
    requiresAssembly: false
  },
  {
    id: "std_top_samsung",
    name: "\uC77C\uBC18 \uC0C1\uB2E8(\uC0BC\uC131)",
    category: "\uC77C\uBC18\uBCF4\uAD00\uD568",
    unit: "",
    defaultSupplier: "seil",
    defaultMinThreshold: 15,
    moq: 20,
    unitCostEstimate: 11e4,
    description: "\uC0BC\uC131\uC804\uC790 \uB0A9\uD488\uC6A9 \uD2B9\uD654 \uADDC\uACA9 \uC77C\uBC18 \uC0C1\uB2E8 (\uCD94\uAC00 \uC870\uB9BD \uD544\uC694)",
    requiresAssembly: true
  },
  {
    id: "std_bottom_samsung",
    name: "\uC77C\uBC18 \uD558\uB2E8(\uC0BC\uC131)",
    category: "\uC77C\uBC18\uBCF4\uAD00\uD568",
    unit: "",
    defaultSupplier: "seil",
    defaultMinThreshold: 15,
    moq: 20,
    unitCostEstimate: 98e3,
    description: "\uC0BC\uC131\uC804\uC790 \uB0A9\uD488\uC6A9 \uD2B9\uD654 \uADDC\uACA9 \uC77C\uBC18 \uD558\uB2E8",
    requiresAssembly: false
  },
  {
    id: "outdoor",
    name: "\uC625\uC678",
    category: "\uC625\uC678/\uC774\uB3D9/\uD2B9\uC218",
    unit: "",
    defaultSupplier: "seil",
    defaultMinThreshold: 5,
    moq: 5,
    unitCostEstimate: 28e4,
    description: "\uBC29\uC218/\uBC29\uC9C4/\uD56D\uC628 \uBC0F \uC81C\uC5B4\uBCF4\uB4DC \uD0D1\uC7AC \uC625\uC678 \uC124\uCE58\uD615 \uBCF4\uAD00\uD568 (\uCD94\uAC00 \uC870\uB9BD \uD544\uC694)",
    requiresAssembly: true
  },
  {
    id: "mobile",
    name: "\uC774\uB3D9",
    category: "\uC625\uC678/\uC774\uB3D9/\uD2B9\uC218",
    unit: "",
    defaultSupplier: "seil",
    defaultMinThreshold: 15,
    moq: 20,
    unitCostEstimate: 16e4,
    description: "\uCC28\uB7C9 \uBC0F \uC774\uB3D9\uC2DD \uBC30\uCE58 \uC804\uC6A9 \uBCF4\uAD00\uD568 (\uB0B4\uBD80 \uC644\uCDA9\uC7AC \uBC0F \uCCB4\uACB0 \uC870\uB9BD \uD544\uC694)",
    requiresAssembly: true
  },
  {
    id: "forklift_bag",
    name: "\uC9C0\uAC8C\uAC00\uBC29",
    category: "\uC625\uC678/\uC774\uB3D9/\uD2B9\uC218",
    unit: "",
    defaultSupplier: "seil",
    defaultMinThreshold: 10,
    moq: 15,
    unitCostEstimate: 65e3,
    description: "\uD734\uB300\uC6A9 \uBC0F \uBE44\uC0C1 \uC9C0\uAC8C\uD615 \uCE90\uB9C1 \uBC31",
    requiresAssembly: false
  },
  {
    id: "semi_outdoor",
    name: "\uC138\uBBF8\uC544\uC6C3\uB3C4\uC5B4",
    category: "\uC625\uC678/\uC774\uB3D9/\uD2B9\uC218",
    unit: "",
    defaultSupplier: "seil",
    defaultMinThreshold: 5,
    moq: 5,
    unitCostEstimate: 21e4,
    description: "\uCE90\uB178\uD53C/\uBC18\uC57C\uC678 \uC124\uCE58\uC6A9 \uC900\uC625\uC678 \uBCF4\uAD00\uD568",
    requiresAssembly: false
  },
  {
    id: "terminal_board",
    name: "\uB2E8\uB9D0\uAE30\uBCF4\uB4DC",
    category: "\uC804\uC7A5\uBD80\uD488",
    unit: "EA",
    defaultSupplier: "smt",
    defaultMinThreshold: 30,
    moq: 50,
    unitCostEstimate: 45e3,
    description: "\uC2A4\uB9C8\uD2B8 \uBCF4\uAD00\uD568 \uB0B4\uC7A5 IoT \uC81C\uC5B4 \uB2E8\uB9D0\uAE30 \uBA54\uC778 PCB (\uC0C1\uB2E8 \uBC0F \uC625\uC678 \uC870\uB9BD \uC2DC \uD22C\uC785)",
    requiresAssembly: false
  }
];

// src/data/masterData.ts
var BUILTIN_LEDGER_SHEET_NAMES = {
  lucciem: "\uB8E8\uC528\uC5E0-\uC624\uB984\uCC28\uC21C",
  seil: "\uC138\uC77C\uC815\uBC00\uACF5\uC5C5-\uC624\uB984\uCC28\uC21C",
  ijin: "\uC544\uC774\uC9C4-\uC624\uB984\uCC28\uC21C",
  etc: "etc-\uC624\uB984\uCC28\uC21C"
};
var PRODUCT_CATEGORIES = [
  "Smart AED",
  "\uC77C\uBC18\uBCF4\uAD00\uD568",
  "\uC625\uC678/\uC774\uB3D9/\uD2B9\uC218",
  "\uC804\uC7A5\uBD80\uD488"
];
var DEFAULT_CATEGORY_LABELS = {
  "Smart AED": "Smart AED",
  \uC77C\uBC18\uBCF4\uAD00\uD568: "\uC77C\uBC18\uBCF4\uAD00\uD568",
  "\uC625\uC678/\uC774\uB3D9/\uD2B9\uC218": "\uC625\uC678 / \uC774\uB3D9 / \uD2B9\uC218",
  \uC804\uC7A5\uBD80\uD488: "\uC804\uC7A5\uBD80\uD488"
};
var DEFAULT_PRODUCTS = PRODUCTS.map((product) => ({
  id: product.id,
  name: product.name,
  unit: product.unit,
  unitCostEstimate: product.unitCostEstimate,
  category: product.category
}));
var DEFAULT_LOCATIONS = LOCATIONS.map((location) => ({
  id: location.id,
  name: location.name,
  shortName: location.shortName,
  description: location.description,
  sheetName: BUILTIN_LEDGER_SHEET_NAMES[location.id] || `${location.shortName}-\uC624\uB984\uCC28\uC21C`
}));
var DEFAULT_MASTER_DATA = {
  products: DEFAULT_PRODUCTS,
  locations: DEFAULT_LOCATIONS,
  categories: PRODUCT_CATEGORIES.map((id) => ({ id, label: DEFAULT_CATEGORY_LABELS[id] })),
  suppliers: ["\uC138\uC77C\uC815\uBC00\uACF5\uC5C5", "\uC544\uC774\uC9C4", "SMT"]
};
var activeCategoryLabels = { ...DEFAULT_CATEGORY_LABELS };
var activeSuppliers = [...DEFAULT_MASTER_DATA.suppliers];
var activeLedgerNames = { ...BUILTIN_LEDGER_SHEET_NAMES };
function getLocationSheetName(locationId) {
  return activeLedgerNames[locationId] || null;
}
function findLocationIdBySheetName(sheetName) {
  const found = Object.entries(activeLedgerNames).find(([, name]) => name === sheetName);
  return found?.[0] || null;
}

// src/utils/googleSheetSync.ts
import * as XLSX2 from "xlsx";

// src/utils/masterDataSheet.ts
import * as XLSX from "xlsx";
var MASTER_DATA_SHEET_NAME = "\uB9C8\uC2A4\uD130\uB370\uC774\uD130";
var MASTER_DATA_HEADER = ["\uAD6C\uBD84", "ID", "\uC774\uB984", "\uC57D\uCE6D", "\uB2E8\uC704", "\uB2E8\uAC00", "\uC124\uBA85", "\uBD84\uB958", "\uC2DC\uD2B8\uD0ED"];

// src/utils/googleSheetSync.ts
var ACTIVE_LEDGER_SHEET_NAMES = {
  lucciem: "\uB8E8\uC528\uC5E0-\uC624\uB984\uCC28\uC21C",
  seil: "\uC138\uC77C\uC815\uBC00\uACF5\uC5C5-\uC624\uB984\uCC28\uC21C",
  ijin: "\uC544\uC774\uC9C4-\uC624\uB984\uCC28\uC21C",
  etc: "etc-\uC624\uB984\uCC28\uC21C"
};
function activeLedgerLocation(sheetName) {
  return findLocationIdBySheetName(sheetName) || (Object.entries(ACTIVE_LEDGER_SHEET_NAMES).find(([, expectedName]) => expectedName === sheetName)?.[0] ?? null);
}
function normalize(text) {
  return String(text).toLowerCase().replace(/\s+/g, "").replace(/[()[\]{}]/g, "").replace(/보관함/g, "");
}
function emptyQuantities() {
  return PRODUCTS.reduce((acc, product) => {
    acc[product.id] = 0;
    return acc;
  }, {});
}
function createEmptyStocks() {
  return LOCATIONS.map((loc) => ({
    locationId: loc.id,
    quantities: emptyQuantities(),
    unassembledQuantities: emptyQuantities(),
    exceptionNotes: {},
    remarks: ""
  }));
}
function matchProduct(cell) {
  const n = normalize(cell);
  if (!n) return null;
  const aliases = {
    smart_top: ["smart\uC0C1\uB2E8", "smartaed\uC0C1\uB2E8", "\uC2A4\uB9C8\uD2B8\uC0C1\uB2E8", "smart_top"],
    smart_bottom: ["smart\uD558\uB2E8", "smartaed\uD558\uB2E8", "\uC2A4\uB9C8\uD2B8\uD558\uB2E8", "smart_bottom"],
    smart_top_eng: ["smart\uC0C1\uB2E8\uC601\uBB38", "\uC601\uBB38\uC0C1\uB2E8", "smart_top_eng"],
    std_top: ["\uC77C\uBC18\uC0C1\uB2E8", "\uC2E4\uB0B4\uC77C\uBC18\uC0C1\uB2E8", "std_top"],
    std_bottom: ["\uC77C\uBC18\uD558\uB2E8", "\uC2E4\uB0B4\uC77C\uBC18\uD558\uB2E8", "std_bottom"],
    std_top_samsung: ["\uC77C\uBC18\uC0C1\uB2E8\uC0BC\uC131", "\uC0BC\uC131\uC0C1\uB2E8", "std_top_samsung"],
    std_bottom_samsung: ["\uC77C\uBC18\uD558\uB2E8\uC0BC\uC131", "\uC0BC\uC131\uD558\uB2E8", "std_bottom_samsung"],
    outdoor: ["\uC625\uC678", "\uC625\uC678\uD615", "outdoor"],
    mobile: ["\uC774\uB3D9", "\uC774\uB3D9\uD615", "mobile"],
    forklift_bag: ["\uC9C0\uAC8C\uAC00\uBC29", "forklift"],
    semi_outdoor: ["\uC138\uBBF8\uC544\uC6C3\uB3C4\uC5B4", "\uC900\uC625\uC678", "semioutdoor"],
    terminal_board: ["\uB2E8\uB9D0\uAE30\uBCF4\uB4DC", "\uB2E8\uB9D0\uAE30", "\uC804\uC7A5\uBCF4\uB4DC", "terminal"]
  };
  for (const product of PRODUCTS) {
    if (n === normalize(product.name) || n === product.id) return product.id;
  }
  const liveIds = new Set(PRODUCTS.map((product) => product.id));
  const rankedAliases = Object.entries(aliases).flatMap(([id, list]) => list.map((alias) => ({ id, alias }))).sort((a, b) => b.alias.length - a.alias.length);
  for (const { id, alias } of rankedAliases) {
    if (!liveIds.has(id)) continue;
    if (n === alias || n.includes(alias)) return id;
  }
  return null;
}
function matchLocation(cell) {
  const n = normalize(cell);
  if (!n) return null;
  for (const location of LOCATIONS) {
    const sheetName = getLocationSheetName(location.id);
    if (n === normalize(location.name) || n === normalize(location.shortName) || n === location.id || sheetName && n === normalize(sheetName)) {
      return location.id;
    }
  }
  const live = new Set(LOCATIONS.map((location) => location.id));
  if (live.has("lucciem") && (n.includes("\uB8E8\uC528\uC5E0") || n === "lucciem" || n === "\uC0AC\uBB34\uC2E4")) return "lucciem";
  if (live.has("seil") && (n.includes("\uC138\uC77C\uC815\uBC00") || n === "seil")) return "seil";
  if (live.has("ijin") && (n.includes("\uC544\uC774\uC9C4") || n === "ijin")) return "ijin";
  if (live.has("etc") && (n === "etc" || n.startsWith("etc") || n.includes("\uAE30\uD0C0"))) return "etc";
  return null;
}
function parseSignedQuantity(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const matched = String(value ?? "").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!matched) return 0;
  const parsed = Number(matched[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}
function parseQuantity(value) {
  return Math.max(0, parseSignedQuantity(value));
}
function formatSheetDate(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
function excelSerialToDate(serial) {
  const milliseconds = Date.UTC(1899, 11, 30) + Math.floor(serial) * 864e5;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}
function cellText(value) {
  if (value == null) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatSheetDate(value);
  }
  return String(value).trim();
}
function cellToDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatSheetDate(value);
  }
  const s = cellText(value);
  if (!s || /갱신일|현재/.test(s)) return null;
  const compact = s.replace(/\s+/g, "");
  if (/^\d{4}$/.test(compact)) return compact;
  const iso = compact.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }
  const mdY = compact.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdY) {
    const year = Number(mdY[3]) < 100 ? 2e3 + Number(mdY[3]) : Number(mdY[3]);
    return `${year}-${mdY[1].padStart(2, "0")}-${mdY[2].padStart(2, "0")}`;
  }
  const serial = Number(s);
  if (serial > 2e4 && serial < 8e4) {
    return excelSerialToDate(serial);
  }
  return null;
}
function sheetToRows(ws, keepBlankRows = false) {
  return XLSX2.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    raw: true,
    blankrows: keepBlankRows
  });
}
function findHeaderRow(rows, kind) {
  const limit = Math.min(rows.length, 20);
  for (let i = 0; i < limit; i++) {
    const cells = (rows[i] || []).map((c) => cellText(c));
    if (kind === "dashboard") {
      const locHit = cells.some((c) => /장소|거점|위치/.test(c));
      const productHits = cells.filter((c) => matchProduct(c)).length;
      const locationHits = cells.filter((c) => matchLocation(c)).length;
      if (locHit && productHits >= 2) return i;
      if (productHits >= 4) return i;
      if (locationHits >= 2 && productHits < 2) return i;
    } else {
      const dateHit = cells.some((c) => /일자|날짜|date/i.test(c));
      const typeHit = cells.some((c) => /구분|유형|입출고|type/i.test(c));
      const descHit = cells.some((c) => /내역|내용|설명|description/i.test(c));
      const partnerHit = cells.some((c) => /납품|거래|상대|partner/i.test(c));
      if (dateHit && typeHit || typeHit && (descHit || partnerHit)) return i;
    }
  }
  return -1;
}
function parseMovementType(value) {
  const n = normalize(value);
  if (!n) return null;
  if (n.includes("\uC785\uACE0") || n === "in") return "IN";
  if (n.includes("\uCD9C\uACE0") || n === "out") return "OUT";
  if (n.includes("\uBCF4\uC815") || n === "adjustment") return "ADJUSTMENT";
  if (n.includes("\uC774\uB3D9") || n.includes("\uC774\uAD00") || n === "transfer") return "TRANSFER";
  return null;
}
function isHistoricalTab(name) {
  const n = name.trim();
  return /^\d{4}/.test(n) || /\.org$/i.test(n) || /\.\d{4}$/i.test(n);
}
function pickDashboardSheetName(names) {
  const exact = names.find((n) => {
    const t = n.trim().toLowerCase();
    return t === "dashboard" || t === "\uBCF4\uAD00\uD568 dashboard";
  });
  if (exact) return exact;
  return names.find((n) => /dashboard|대시보드|보관함/i.test(n) && !isHistoricalTab(n)) ?? names[0] ?? null;
}
function parseDashboardSheet(ws) {
  const rows = sheetToRows(ws);
  if (rows.length === 0) return createEmptyStocks();
  const headerIndex = findHeaderRow(rows, "dashboard");
  if (headerIndex < 0) return createEmptyStocks();
  const header = (rows[headerIndex] || []).map((c) => cellText(c));
  const productCols = header.map((cell, idx) => ({ idx, productId: matchProduct(cell) }));
  const locationCols = header.map((cell, idx) => ({ idx, locationId: matchLocation(cell) }));
  const remarksIdx = header.findIndex((c) => /비고|메모|remarks/i.test(c));
  const locationColIdx = header.findIndex((c) => /장소|거점|위치/.test(c) || matchLocation(c));
  const stocks = createEmptyStocks();
  const transposed = locationCols.filter((c) => c.locationId).length >= 2 && productCols.filter((c) => c.productId).length < 2;
  if (transposed) {
    for (let r = headerIndex + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const productId = matchProduct(cellText(row[0]));
      if (!productId) continue;
      for (const col of locationCols) {
        if (!col.locationId) continue;
        const stock = stocks.find((s) => s.locationId === col.locationId);
        if (stock) stock.quantities[productId] = parseQuantity(row[col.idx]);
      }
    }
    return stocks;
  }
  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const locLabel = cellText(locationColIdx >= 0 ? row[locationColIdx] : row[0]);
    if (/총계|합계|total|제품군/i.test(locLabel)) continue;
    const locationId = matchLocation(locLabel);
    if (!locationId) continue;
    const stock = stocks.find((s) => s.locationId === locationId);
    if (!stock) continue;
    for (const col of productCols) {
      if (!col.productId) continue;
      stock.quantities[col.productId] = parseQuantity(row[col.idx]);
    }
    if (remarksIdx >= 0) {
      stock.remarks = cellText(row[remarksIdx]);
    }
  }
  return stocks;
}
function applyActiveLedgerStocks(workbook, dashboardSheetName, dashboardStocks) {
  const stocks = JSON.parse(JSON.stringify(dashboardStocks));
  for (const sheetName of workbook.SheetNames) {
    if (sheetName === dashboardSheetName || isHistoricalTab(sheetName)) continue;
    const locationId = activeLedgerLocation(sheetName);
    if (!locationId) continue;
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;
    const rows = sheetToRows(ws, true);
    const headerIndex = findHeaderRow(rows, "movement");
    if (headerIndex < 0) continue;
    const onHandRowIndex = rows.slice(0, headerIndex).findIndex(
      (row) => row.some((cell) => /현\s*재고|현재\s*재고/.test(cellText(cell)))
    );
    if (onHandRowIndex < 0) continue;
    const stock = stocks.find((item) => item.locationId === locationId);
    if (!stock) continue;
    const header = (rows[headerIndex] || []).map((cell) => cellText(cell));
    header.forEach((cell, columnIndex) => {
      const productId = matchProduct(cell);
      if (!productId) return;
      const rawValue = (rows[onHandRowIndex] || [])[columnIndex];
      if (cellText(rawValue) === "") return;
      stock.quantities[productId] = parseSignedQuantity(rawValue);
    });
  }
  return stocks;
}
function parseMovementSheet(ws, fallbackLocationId, sheetName) {
  const rows = sheetToRows(ws);
  if (rows.length === 0) return [];
  const headerIndex = findHeaderRow(rows, "movement");
  if (headerIndex < 0) return [];
  const header = (rows[headerIndex] || []).map((c) => cellText(c));
  const dateIdx = header.findIndex((c) => /일자|날짜|date/i.test(c));
  const typeIdx = header.findIndex((c) => /구분|유형|입출고|type/i.test(c));
  const descIdx = header.findIndex((c) => /내역|내용|설명|description/i.test(c));
  const partnerIdx = header.findIndex((c) => /납품|거래|상대|partner/i.test(c));
  const productCols = header.map((cell, idx) => ({ idx, productId: matchProduct(cell) })).filter((col) => col.productId);
  const movements = [];
  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const date = dateIdx >= 0 ? cellToDate(row[dateIdx]) : null;
    const type = parseMovementType(typeIdx >= 0 ? cellText(row[typeIdx]) : "");
    const description = descIdx >= 0 ? cellText(row[descIdx]) : "";
    if (!date || !type) continue;
    const isAdjustment = type === "ADJUSTMENT" || /보정/.test(description);
    const items = productCols.map((col) => {
      const signedQuantity = parseSignedQuantity(row[col.idx]);
      return {
        productId: col.productId,
        quantity: Math.abs(signedQuantity),
        ...isAdjustment ? { signedQuantity } : {}
      };
    }).filter((item) => item.quantity > 0);
    if (items.length === 0) continue;
    const locationId = fallbackLocationId ?? matchLocation(sheetName) ?? "lucciem";
    movements.push({
      id: `GS-${locationId}-${date}-${r}`,
      date,
      type,
      locationId: type === "TRANSFER" ? void 0 : locationId,
      fromLocation: type === "OUT" ? locationId : void 0,
      toLocation: type === "IN" ? locationId : void 0,
      items,
      description: description || (type === "IN" ? "\uC785\uACE0" : type === "OUT" ? "\uCD9C\uACE0" : type === "ADJUSTMENT" ? "\uBCF4\uC815" : "\uC774\uB3D9"),
      partnerOrRecipient: partnerIdx >= 0 ? cellText(row[partnerIdx]) : description || void 0,
      registeredBy: "Google Sheet",
      sheetSynced: true,
      sheetRows: [{ sheetName, row: r + 1, expectedDescription: description }]
    });
  }
  return movements;
}
function parseGoogleWorkbook(workbook) {
  const tabNames = workbook.SheetNames;
  const dashboardSheetName = pickDashboardSheetName(tabNames);
  const dashboardSheet = dashboardSheetName ? workbook.Sheets[dashboardSheetName] : workbook.Sheets[tabNames[0]];
  const stocks = applyActiveLedgerStocks(
    workbook,
    dashboardSheetName,
    parseDashboardSheet(dashboardSheet)
  );
  const filledCount = stocks.reduce(
    (sum, loc) => sum + Object.values(loc.quantities).reduce((a, b) => a + b, 0),
    0
  );
  const movements = tabNames.flatMap((name) => {
    if (name === dashboardSheetName || isHistoricalTab(name)) return [];
    const locationId = activeLedgerLocation(name);
    if (!locationId) return [];
    return parseMovementSheet(workbook.Sheets[name], locationId, name);
  });
  if (filledCount === 0 && movements.length === 0) {
    throw new Error(
      `\uC2DC\uD2B8\uB294 \uC5F4\uB838\uC9C0\uB9CC \uC7AC\uACE0 \uD45C \uD615\uC2DD\uC744 \uC778\uC2DD\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uD0ED: ${tabNames.join(", ")}.`
    );
  }
  return {
    stocks,
    movements,
    tabNames,
    dashboardSheetName
  };
}

// src/utils/googleSheetMutate.ts
function locationSheetName(workbook, locationId) {
  const expectedName = getLocationSheetName(locationId) || ACTIVE_LEDGER_SHEET_NAMES[locationId];
  return expectedName && workbook.SheetNames.includes(expectedName) ? expectedName : null;
}
function productColMap(header) {
  const cols = {};
  header.forEach((cell, idx) => {
    const productId = matchProduct(cell);
    if (productId && cols[productId] == null) cols[productId] = idx;
  });
  return cols;
}
function planLedgerTotalFormulaUpdates(workbook, sheetName, lastDataRow) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) return [];
  const updates = [];
  for (const address of Object.keys(ws)) {
    if (address.startsWith("!")) continue;
    const cell = ws[address];
    const formula = String(cell.f || "").trim();
    const range = formula.match(
      /^SUM\(\s*(\$?([A-Z]+)\$?\d+)\s*:\s*(\$?([A-Z]+)\$?)(\d+)\s*\)$/i
    );
    if (!range || range[2].toUpperCase() !== range[4].toUpperCase()) continue;
    const position = XLSX3.utils.decode_cell(address);
    const formulaColumn = XLSX3.utils.encode_col(position.c);
    if (formulaColumn.toUpperCase() !== range[2].toUpperCase()) continue;
    const nextFormula = formula.replace(
      /(:\s*\$?[A-Z]+\$?)\d+(\s*\)\s*)$/i,
      `$1${lastDataRow}$2`
    );
    updates.push({
      sheetName,
      row: position.r + 1,
      col: position.c + 1,
      value: `=${nextFormula}`
    });
  }
  return updates;
}
function lastFilledExcelRow(rows, colIdx, startRow0) {
  for (let r = rows.length - 1; r >= startRow0; r--) {
    if (cellText((rows[r] || [])[colIdx])) return r + 1;
  }
  return startRow0 + 1;
}
function buildLedgerRow(headerLen, dateCol, typeCol, descCol, productCols, date, typeLabel, desc, items, sign, partnerCol, partner) {
  const values = Array.from({ length: Math.max(headerLen, 3) }, () => "");
  values[dateCol] = date;
  values[typeCol] = typeLabel;
  values[descCol] = desc;
  for (const item of items) {
    const col = productCols[item.productId];
    if (col == null) continue;
    values[col] = typeof item.signedQuantity === "number" ? item.signedQuantity : sign * Number(item.quantity || 0);
  }
  if (partnerCol != null && partnerCol >= 0) values[partnerCol] = partner || "";
  return values;
}
function planLedgerAppend(workbook, locationId, date, typeLabel, desc, items, sign, partner) {
  if (!locationId) return null;
  const sheetName = locationSheetName(workbook, locationId);
  if (!sheetName) return null;
  const ws = workbook.Sheets[sheetName];
  if (!ws) return null;
  const rows = sheetToRows(ws, true);
  const headerIndex = findHeaderRow(rows, "movement");
  if (headerIndex < 0) return null;
  const header = (rows[headerIndex] || []).map((c) => cellText(c));
  const dateCol = Math.max(0, header.findIndex((c) => /일자|날짜|date/i.test(c)));
  const typeCol = Math.max(
    1,
    header.findIndex((c) => /구분|유형|입출고|type/i.test(c))
  );
  const descHit = header.findIndex((c) => /내역|내용|설명|description/i.test(c));
  const descCol = descHit >= 0 ? descHit : 2;
  const partnerCol = header.findIndex((c) => /납품|거래|상대|partner/i.test(c));
  const productCols = productColMap(header);
  const appendRow = lastFilledExcelRow(rows, dateCol, headerIndex + 1) + 1;
  return {
    sheetName,
    row: appendRow,
    values: buildLedgerRow(
      header.length,
      dateCol,
      typeCol,
      descCol,
      productCols,
      date,
      typeLabel,
      desc,
      items,
      sign,
      partnerCol,
      partner
    )
  };
}
function planOnHandUpdates(workbook, stocks) {
  const updates = [];
  for (const stock of stocks) {
    const sheetName = locationSheetName(workbook, stock.locationId);
    if (!sheetName) continue;
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;
    const rows = sheetToRows(ws, true);
    let onHandRow0 = -1;
    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const first = cellText((rows[r] || [])[0]);
      if (/현재\s*재고|현재재고|현\s*재고/.test(first)) onHandRow0 = r;
    }
    const headerIndex = findHeaderRow(rows, "movement");
    if (onHandRow0 < 0 || headerIndex < 0) continue;
    const header = (rows[headerIndex] || []).map((c) => cellText(c));
    const productCols = productColMap(header);
    for (const [productId, col] of Object.entries(productCols)) {
      if (col == null) continue;
      updates.push({
        sheetName,
        row: onHandRow0 + 1,
        col: col + 1,
        value: Number(stock.quantities[productId] || 0)
      });
    }
  }
  return updates;
}
function planDashboardUpdates(workbook, stocks) {
  const sheetName = pickDashboardSheetName(
    workbook.SheetNames.filter((n) => !isHistoricalTab(n))
  );
  if (!sheetName) return [];
  const ws = workbook.Sheets[sheetName];
  if (!ws) return [];
  const rows = sheetToRows(ws, true);
  const headerIndex = findHeaderRow(rows, "dashboard");
  if (headerIndex < 0) return [];
  const header = (rows[headerIndex] || []).map((c) => cellText(c));
  const locCol = Math.max(
    0,
    header.findIndex((c) => /장소|거점|위치/.test(c) || Boolean(matchLocation(c)))
  );
  const productCols = productColMap(header);
  const updates = [];
  const totals = {};
  for (let r = headerIndex + 1; r < rows.length; r++) {
    const label = cellText((rows[r] || [])[locCol]);
    if (/합계|총계|total/i.test(label)) {
      for (const [productId, col] of Object.entries(productCols)) {
        if (col == null) continue;
        updates.push({
          sheetName,
          row: r + 1,
          col: col + 1,
          value: Number(totals[productId] || 0)
        });
      }
      break;
    }
    const locationId = matchLocation(label);
    if (!locationId) continue;
    const stock = stocks.find((s) => s.locationId === locationId);
    if (!stock) continue;
    for (const [productId, col] of Object.entries(productCols)) {
      if (col == null) continue;
      const qty = Number(stock.quantities[productId] || 0);
      totals[productId] = Number(totals[productId] || 0) + qty;
      updates.push({
        sheetName,
        row: r + 1,
        col: col + 1,
        value: qty
      });
    }
  }
  return updates;
}
function planDashboardRemarkUpdate(workbook, locationId, remarks) {
  const sheetName = pickDashboardSheetName(
    workbook.SheetNames.filter((name) => !isHistoricalTab(name))
  );
  if (!sheetName) throw new Error("Dashboard \uD0ED\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  const ws = workbook.Sheets[sheetName];
  if (!ws) throw new Error("Dashboard \uD0ED\uC744 \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  const rows = sheetToRows(ws, true);
  const headerIndex = findHeaderRow(rows, "dashboard");
  if (headerIndex < 0) throw new Error("Dashboard \uD5E4\uB354\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  const header = (rows[headerIndex] || []).map((cell) => cellText(cell));
  const locationCol = Math.max(
    0,
    header.findIndex((cell) => /장소|거점|위치/.test(cell) || Boolean(matchLocation(cell)))
  );
  const remarksCol = header.findIndex((cell) => /비고|메모|remarks/i.test(cell));
  if (remarksCol < 0) throw new Error("Dashboard \uBE44\uACE0 \uC5F4\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex++) {
    if (matchLocation(cellText((rows[rowIndex] || [])[locationCol])) === locationId) {
      return {
        appends: [],
        updates: [
          {
            sheetName,
            row: rowIndex + 1,
            col: remarksCol + 1,
            value: remarks
          }
        ]
      };
    }
  }
  throw new Error("Dashboard\uC5D0\uC11C \uC120\uD0DD\uD55C \uAC70\uC810 \uD589\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
}
function planStockPersist(workbook, stocks) {
  const updates = [...planOnHandUpdates(workbook, stocks), ...planDashboardUpdates(workbook, stocks)];
  return { appends: [], updates };
}
function planFullPersist(workbook, stocks, movements) {
  const currentSheetMovements = parseGoogleWorkbook(workbook).movements;
  const ledgerRows = { lucciem: [], seil: [], ijin: [], etc: [] };
  for (const movement of movements) {
    if (movement.type === "TRANSFER") {
      if (movement.fromLocation) {
        ledgerRows[movement.fromLocation].push({
          movementId: movement.id,
          movement,
          typeLabel: "\uCD9C\uACE0",
          sign: -1
        });
      }
      if (movement.toLocation) {
        ledgerRows[movement.toLocation].push({
          movementId: movement.id,
          movement,
          typeLabel: "\uC785\uACE0",
          sign: 1
        });
      }
    } else {
      const locationId = movement.locationId || movement.toLocation || movement.fromLocation;
      if (!locationId) continue;
      ledgerRows[locationId].push({
        movementId: movement.id,
        movement,
        typeLabel: movement.type === "IN" ? "\uC785\uACE0" : movement.type === "ADJUSTMENT" ? "\uBCF4\uC815" : "\uCD9C\uACE0",
        sign: movement.type === "OUT" ? -1 : 1
      });
    }
  }
  const replacements = [];
  for (const locationId of Object.keys(ledgerRows)) {
    const sheetName = locationSheetName(workbook, locationId);
    if (!sheetName) {
      if (ledgerRows[locationId].length > 0) {
        throw new Error(`\uC6D0\uC7A5 \uD0ED\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4: ${locationId}`);
      }
      continue;
    }
    const ws = workbook.Sheets[sheetName];
    const rows = sheetToRows(ws, true);
    const headerIndex = findHeaderRow(rows, "movement");
    if (headerIndex < 0) {
      if (ledgerRows[locationId].length > 0) {
        throw new Error(`\uC785\uCD9C\uACE0 \uD5E4\uB354\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4: ${sheetName}`);
      }
      continue;
    }
    const header = (rows[headerIndex] || []).map((cell) => cellText(cell));
    const dateCol = Math.max(
      0,
      header.findIndex((cell) => /일자|날짜|date/i.test(cell))
    );
    const typeCol = Math.max(
      1,
      header.findIndex((cell) => /구분|유형|입출고|type/i.test(cell))
    );
    const descHit = header.findIndex((cell) => /내역|내용|설명|description/i.test(cell));
    const descCol = descHit >= 0 ? descHit : 2;
    const partnerCol = header.findIndex((cell) => /납품|거래|상대|partner/i.test(cell));
    const productCols = productColMap(header);
    const startRow = headerIndex + 2;
    const formulaRows = /* @__PURE__ */ new Set();
    for (const address of Object.keys(ws)) {
      if (address.startsWith("!")) continue;
      const cell = ws[address];
      if (cell.f && /SUM/i.test(cell.f)) {
        formulaRows.add(XLSX3.utils.decode_cell(address).r + 1);
      }
    }
    const formulaRow = [...formulaRows].filter((row) => row >= startRow).sort((a, b) => a - b)[0];
    let lastDataRow = startRow - 1;
    for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex++) {
      if (formulaRow && rowIndex + 1 >= formulaRow) break;
      if (cellText((rows[rowIndex] || [])[dateCol])) lastDataRow = rowIndex + 1;
    }
    const plannedRows = ledgerRows[locationId];
    const managedSourceRows = new Set(
      currentSheetMovements.flatMap(
        (movement) => (movement.sheetRows || []).filter((ref) => ref.sheetName === sheetName).map((ref) => ref.row)
      )
    );
    const unmanagedValues = [];
    for (let row = startRow; row <= lastDataRow; row++) {
      if (managedSourceRows.has(row)) continue;
      const existing = rows[row - 1] || [];
      unmanagedValues.push(
        Array.from({ length: Math.max(header.length, 3) }, (_, column) => {
          const value = existing[column];
          return typeof value === "number" ? value : cellText(value);
        })
      );
    }
    const managedValues = plannedRows.map(
      ({ movement, typeLabel, sign }) => buildLedgerRow(
        header.length,
        dateCol,
        typeCol,
        descCol,
        productCols,
        movement.date,
        typeLabel,
        movement.description || "",
        movement.items,
        sign,
        partnerCol,
        movement.partnerOrRecipient
      )
    );
    const values = [...managedValues, ...unmanagedValues];
    replacements.push({
      sheetName,
      startRow,
      clearRowCount: Math.max(0, lastDataRow - startRow + 1),
      columnCount: Math.max(header.length, 3),
      values,
      movementIds: plannedRows.map(({ movementId }) => movementId),
      formulaRow
    });
  }
  const updates = replacements.flatMap(
    (replacement) => planLedgerTotalFormulaUpdates(
      workbook,
      replacement.sheetName,
      Math.max(
        replacement.startRow,
        replacement.startRow + replacement.values.length - 1
      )
    )
  );
  if (replacements.length === 0) {
    throw new Error("\uB3D9\uAE30\uD654\uD560 \uC6D0\uC7A5 \uD0ED\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  }
  return { appends: [], updates, replacements };
}
function planSheetWrites(workbook, movement, stocks) {
  const items = movement.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    signedQuantity: item.signedQuantity
  }));
  const desc = movement.description || "";
  const date = movement.date || "";
  const partner = movement.partnerOrRecipient || "";
  const appends = [];
  if (movement.type === "TRANSFER") {
    const outRow = planLedgerAppend(
      workbook,
      movement.fromLocation,
      date,
      "\uCD9C\uACE0",
      desc,
      items,
      -1,
      partner
    );
    const inRow = planLedgerAppend(workbook, movement.toLocation, date, "\uC785\uACE0", desc, items, 1, partner);
    if (outRow) appends.push(outRow);
    if (inRow) appends.push(inRow);
  } else {
    const locationId = movement.locationId || movement.toLocation || movement.fromLocation;
    const append = planLedgerAppend(
      workbook,
      locationId,
      date,
      movement.type === "IN" ? "\uC785\uACE0" : movement.type === "ADJUSTMENT" ? "\uBCF4\uC815" : "\uCD9C\uACE0",
      desc,
      items,
      movement.type === "OUT" ? -1 : 1,
      partner
    );
    if (append) appends.push(append);
  }
  const lastRowsBySheet = /* @__PURE__ */ new Map();
  for (const append of appends) {
    lastRowsBySheet.set(
      append.sheetName,
      Math.max(lastRowsBySheet.get(append.sheetName) || 0, append.row)
    );
  }
  const updates = [...lastRowsBySheet.entries()].flatMap(
    ([sheetName, lastDataRow]) => planLedgerTotalFormulaUpdates(workbook, sheetName, lastDataRow)
  );
  if (appends.length === 0) {
    throw new Error("\uC2DC\uD2B8\uC5D0\uC11C \uC785\uCD9C\uACE0\uB97C \uB0A8\uAE38 \uD0ED/\uC5F4\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. Dashboard\uC640 \uAC70\uC810 \uD0ED \uC774\uB984\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
  }
  return { appends, updates };
}
function quoteA1SheetName(name) {
  return `'${name.replace(/'/g, "''")}'`;
}

// src/utils/stockUtils.ts
import * as XLSX4 from "xlsx";
var ASSEMBLY_TARGET_PRODUCT_IDS = [
  "smart_top",
  "smart_top_eng",
  "std_top",
  "std_top_samsung",
  "outdoor",
  "mobile"
];
function isAssemblyTarget(productId) {
  return ASSEMBLY_TARGET_PRODUCT_IDS.includes(productId);
}
function applyMovementToStocks(currentStocks, movement) {
  const newStocks = JSON.parse(JSON.stringify(currentStocks));
  const findLoc = (id) => newStocks.find((s) => s.locationId === id);
  for (const item of movement.items) {
    const isTarget = isAssemblyTarget(item.productId);
    if (typeof item.signedQuantity === "number" && movement.type !== "TRANSFER") {
      const target = findLoc(
        movement.locationId || (movement.type === "IN" ? movement.toLocation : movement.fromLocation)
      );
      if (target) {
        if (!target.quantities) target.quantities = {};
        target.quantities[item.productId] = Math.max(
          0,
          (target.quantities[item.productId] || 0) + item.signedQuantity
        );
      }
      continue;
    }
    if (movement.type === "ADJUSTMENT") {
      const target = findLoc(movement.locationId);
      if (target) {
        target.quantities[item.productId] = (target.quantities[item.productId] || 0) + item.quantity;
      }
    } else if (movement.type === "IN") {
      const target = findLoc(movement.locationId || movement.toLocation);
      if (target) {
        if (!target.quantities) target.quantities = {};
        target.quantities[item.productId] = (target.quantities[item.productId] || 0) + item.quantity;
      }
    } else if (movement.type === "OUT") {
      const target = findLoc(movement.locationId || movement.fromLocation);
      if (target) {
        if (!target.quantities) target.quantities = {};
        target.quantities[item.productId] = Math.max(
          0,
          (target.quantities[item.productId] || 0) - item.quantity
        );
      }
    } else if (movement.type === "TRANSFER") {
      const fromLoc = findLoc(movement.fromLocation);
      const toLoc = findLoc(movement.toLocation);
      if (fromLoc && toLoc) {
        if (!fromLoc.quantities) fromLoc.quantities = {};
        fromLoc.quantities[item.productId] = Math.max(
          0,
          (fromLoc.quantities[item.productId] || 0) - item.quantity
        );
        if (!toLoc.quantities) toLoc.quantities = {};
        toLoc.quantities[item.productId] = (toLoc.quantities[item.productId] || 0) + item.quantity;
      }
    }
  }
  return newStocks;
}

// server/googleSheetProxy.ts
var SHEET_ID_PATTERN = /^[a-zA-Z0-9-_]{20,}$/;
var MASTER_DATA_MIN_SCRIPT_VERSION = 9;
var SHEET_TAB_PATTERN = /^[^\\/?*[\]:]{1,80}$/;
var sheetWriteLocks = /* @__PURE__ */ new Map();
function withSheetWriteLock(sheetId, task) {
  const key = sheetId || "__default__";
  const previous = sheetWriteLocks.get(key) ?? Promise.resolve();
  const next = previous.catch(() => void 0).then(task);
  sheetWriteLocks.set(
    key,
    next.finally(() => {
      if (sheetWriteLocks.get(key) === next) {
        sheetWriteLocks.delete(key);
      }
    })
  );
  return next;
}
function undoMovementOnStocks(currentStocks, movement) {
  const next = JSON.parse(JSON.stringify(currentStocks));
  const adjust = (locationId, productId, delta) => {
    const stock = next.find((item) => item.locationId === locationId);
    if (!stock) return;
    stock.quantities[productId] = Math.max(
      0,
      Number(stock.quantities[productId] || 0) + delta
    );
  };
  for (const item of movement.items || []) {
    if (typeof item.signedQuantity === "number" && movement.type !== "TRANSFER") {
      adjust(
        movement.locationId || (movement.type === "IN" ? movement.toLocation : movement.fromLocation),
        item.productId,
        -item.signedQuantity
      );
    } else if (movement.type === "ADJUSTMENT") {
      adjust(movement.locationId, item.productId, -item.quantity);
    } else if (movement.type === "IN") {
      adjust(movement.locationId || movement.toLocation, item.productId, -item.quantity);
    } else if (movement.type === "OUT") {
      adjust(movement.locationId || movement.fromLocation, item.productId, item.quantity);
    } else {
      adjust(movement.fromLocation, item.productId, item.quantity);
      adjust(movement.toLocation, item.productId, -item.quantity);
    }
  }
  return next;
}
function movementItemsSignature(movement) {
  return (movement.items || []).map((item) => `${item.productId}:${Number(item.quantity || 0)}:${item.signedQuantity ?? ""}`).sort().join("|");
}
function matchesOriginalMovement(candidate, sourceIds, originals) {
  if (sourceIds.has(candidate.id)) return true;
  for (const orig of originals) {
    if (orig.id === candidate.id) return true;
    const origRows = orig.sheetRows || [];
    const candRows = candidate.sheetRows || [];
    if (origRows.length > 0 && candRows.length > 0 && origRows.some(
      (or) => candRows.some((cr) => cr.sheetName === or.sheetName && cr.row === or.row)
    )) {
      return true;
    }
    const origLoc = orig.locationId || orig.fromLocation || orig.toLocation;
    const candLoc = candidate.locationId || candidate.fromLocation || candidate.toLocation;
    if (orig.date === candidate.date && orig.type === candidate.type && origLoc === candLoc && (orig.description || "").trim() === (candidate.description || "").trim() && movementItemsSignature(orig) === movementItemsSignature(candidate)) {
      return true;
    }
  }
  return false;
}
function buildFreshExportUrl(sheetId) {
  const cacheBust = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx&_t=${encodeURIComponent(cacheBust)}`;
}
function isAllowedWebhook(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "script.google.com" && /\/macros\/s\/[^/]+\/exec$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}
function explainAppsScriptResponse(text) {
  if (/Authorization is required|권한이 필요|승인해야/i.test(text)) {
    return "\uC6F9\uC571 \uAD8C\uD55C \uD5C8\uC6A9\uC774 \uD544\uC694\uD569\uB2C8\uB2E4. \uBC30\uD3EC\uD55C \uAD6C\uAE00 \uACC4\uC815\uC73C\uB85C \uC6F9\uC571 URL\uC744 \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C \uD55C \uBC88 \uC5F4\uACE0 \uAD8C\uD55C\uC744 \uD5C8\uC6A9\uD55C \uB4A4 \uB2E4\uC2DC \uC800\uC7A5\uD558\uC138\uC694.";
  }
  if (/Sign in|로그인|accounts\.google/i.test(text)) {
    return '\uC6F9\uC571 \uC561\uC138\uC2A4\uAC00 \uC7A0\uACA8 \uC788\uC2B5\uB2C8\uB2E4. \uBC30\uD3EC \uC2DC \uC2E4\uD589 \uACC4\uC815\uC740 "\uB098", \uC561\uC138\uC2A4\uB294 "\uBAA8\uB4E0 \uC0AC\uC6A9\uC790"\uB85C \uB2E4\uC2DC \uBC30\uD3EC\uD558\uC138\uC694.';
  }
  if (/You do not have permission|권한이 없/i.test(text)) {
    return "\uC6F9\uC571\uC744 \uC2E4\uD589\uD558\uB294 \uACC4\uC815\uC5D0 \uC2DC\uD2B8 \uD3B8\uC9D1 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uC2DC\uD2B8 \uACF5\uC720(\uD3B8\uC9D1\uC790)\uB97C \uD655\uC778\uD558\uC138\uC694.";
  }
  if (/<html/i.test(text)) {
    return "\uC6F9\uC571\uC774 HTML\uC744 \uBC18\uD658\uD588\uC2B5\uB2C8\uB2E4. URL\uC774 /exec\uB85C \uB05D\uB098\uB294 \uBC30\uD3EC \uC8FC\uC18C\uC778\uC9C0, \uCD5C\uC2E0 \uBC30\uD3EC\uC778\uC9C0 \uD655\uC778\uD558\uC138\uC694.";
  }
  return text.slice(0, 280);
}
var MASTER_DATA_MAX_ROWS = 200;
var MASTER_DATA_MAX_CELL_LENGTH = 200;
function textList(value, max) {
  if (!Array.isArray(value) || value.length > max) return null;
  const items = [];
  for (const entry of value) {
    if (typeof entry !== "string" || entry.length > 80) return null;
    items.push(entry);
  }
  return items;
}
function validateStructureItems(value, withSheet) {
  if (!Array.isArray(value) || value.length > 40) return null;
  const items = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const record = entry;
    const id = String(record.id || "");
    const name = String(record.name || "");
    const match = textList(record.match, 12);
    if (!/^[a-zA-Z0-9_\uac00-\ud7a3 /()-]{1,50}$/.test(id) || !name || name.length > 80 || !match) {
      return null;
    }
    const item = { id, name, match };
    if (withSheet) {
      const sheetName = String(record.sheetName || "");
      const shortName = String(record.shortName || "");
      if (!sheetName.endsWith("-\uC624\uB984\uCC28\uC21C") || !SHEET_TAB_PATTERN.test(sheetName) || shortName.length > 80) {
        return null;
      }
      item.shortName = shortName;
      item.sheetName = sheetName;
    }
    items.push(item);
  }
  return items;
}
function validateMasterStructure(value) {
  if (!value || typeof value !== "object") return null;
  const record = value;
  const products = validateStructureItems(record.products, false);
  const removedProducts = validateStructureItems(record.removedProducts, false);
  const locations = validateStructureItems(record.locations, true);
  const removedLocations = validateStructureItems(record.removedLocations, true);
  if (!products || !removedProducts || !locations || !removedLocations) return null;
  if (products.length === 0 || locations.length === 0) return null;
  return { products, removedProducts, locations, removedLocations };
}
function validateMasterDataRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > MASTER_DATA_MAX_ROWS) return null;
  const header = MASTER_DATA_HEADER;
  const validated = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length !== header.length) return null;
    const cells = row.map((cell) => typeof cell === "string" ? cell : null);
    if (cells.some((cell) => cell === null || cell.length > MASTER_DATA_MAX_CELL_LENGTH)) {
      return null;
    }
    validated.push(cells);
  }
  if (validated[0].some((cell, index) => cell !== header[index])) return null;
  return validated;
}
async function saveMasterDataViaWebhook(webhookUrl, sheetId, rawRows, rawStructure) {
  if (!isAllowedWebhook(webhookUrl)) {
    return {
      status: 400,
      json: { ok: false, error: "\uB9C8\uC2A4\uD130 \uB370\uC774\uD130 \uC800\uC7A5\uC5D0\uB294 Apps Script \uC6F9\uC571 URL\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." }
    };
  }
  if (!SHEET_ID_PATTERN.test(sheetId)) {
    return { status: 400, json: { ok: false, error: "\uC62C\uBC14\uB978 \uAD6C\uAE00 \uC2DC\uD2B8 ID\uAC00 \uC544\uB2D9\uB2C8\uB2E4." } };
  }
  const rows = validateMasterDataRows(rawRows);
  const structure = validateMasterStructure(rawStructure);
  if (!rows || !structure) {
    return { status: 400, json: { ok: false, error: "\uB9C8\uC2A4\uD130 \uB370\uC774\uD130 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." } };
  }
  const response = await fetch(webhookUrl, {
    method: "POST",
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(5e4),
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
      "User-Agent": "Mozilla/5.0 SheetStockSync/1.0",
      "Cache-Control": "no-cache, no-store, max-age=0"
    },
    body: JSON.stringify({
      action: "SAVE_MASTER_DATA",
      sheetId,
      sheetName: MASTER_DATA_SHEET_NAME,
      rows,
      structure
    })
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { status: 502, json: { ok: false, error: explainAppsScriptResponse(text) } };
  }
  if (typeof parsed.version !== "number" || parsed.version < MASTER_DATA_MIN_SCRIPT_VERSION) {
    return {
      status: 502,
      json: {
        ok: false,
        error: "Apps Script\uAC00 \uC774\uC804 \uBC84\uC804\uC774\uB77C \uB9C8\uC2A4\uD130 \uB370\uC774\uD130\uB97C \uC800\uC7A5\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC2DC\uD2B8 \uC124\uC815\uC5D0\uC11C \uCD5C\uC2E0 \uCF54\uB4DC\uB97C \uBCF5\uC0AC\uD574 \uC6F9 \uC571\uC744 \uC0C8 \uBC84\uC804\uC73C\uB85C \uC7AC\uBC30\uD3EC\uD558\uC138\uC694."
      }
    };
  }
  if (parsed.ok === false) {
    return {
      status: 502,
      json: { ok: false, error: parsed.error || "Apps Script\uC5D0\uC11C \uB9C8\uC2A4\uD130 \uB370\uC774\uD130 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4." }
    };
  }
  if (parsed.appendedCount !== rows.length) {
    return {
      status: 502,
      json: {
        ok: false,
        error: `\uB9C8\uC2A4\uD130 \uB370\uC774\uD130 \uBC18\uC601 \uD589 \uC218\uAC00 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. ${parsed.appendedCount}/${rows.length}`
      }
    };
  }
  return {
    status: 200,
    json: { ok: true, version: parsed.version, appendedCount: rows.length, updatedCount: 0, deletedCount: 0 }
  };
}
async function handleGoogleSheetSave(body) {
  const sheetId = String(body.sheetId || "").trim();
  return withSheetWriteLock(sheetId, () => executeGoogleSheetSave(body));
}
async function executeGoogleSheetSave(body) {
  const webhookUrl = String(body.webhookUrl || "").trim();
  const accessToken = String(body.accessToken || "").trim();
  const sheetId = String(body.sheetId || "").trim();
  const action = String(body.action || "");
  const deletes = Array.isArray(body.deletes) ? body.deletes : [];
  const remark = body.remark;
  if (!accessToken && !isAllowedWebhook(webhookUrl)) {
    return {
      status: 400,
      json: {
        ok: false,
        error: "\uC2DC\uD2B8\uC5D0 \uC800\uC7A5\uD558\uB824\uBA74 \uC124\uC815\uC5D0\uC11C Apps Script \uC6F9\uC571 URL\uC744 \uB4F1\uB85D\uD574 \uC8FC\uC138\uC694."
      }
    };
  }
  if (action === "SAVE_MASTER_DATA") {
    return saveMasterDataViaWebhook(webhookUrl, sheetId, body.rows, body.structure);
  }
  let appends = [];
  let updates = [];
  let replacements = [];
  let authoritativeStocks;
  let authoritativeMovements;
  let planningError = "";
  if (SHEET_ID_PATTERN.test(sheetId) && (Array.isArray(body.stocks) || action === "UPDATE_DASHBOARD_REMARK")) {
    try {
      const exportUrl = buildFreshExportUrl(sheetId);
      const xlsxRes = await fetch(exportUrl, {
        redirect: "follow",
        cache: "no-store",
        headers: {
          "User-Agent": "Mozilla/5.0 SheetStockSync/1.0",
          "Cache-Control": "no-cache, no-store, max-age=0",
          Pragma: "no-cache"
        }
      });
      if (xlsxRes.ok) {
        const buffer = Buffer.from(await xlsxRes.arrayBuffer());
        const workbook = XLSX5.read(buffer, { type: "buffer", cellDates: false });
        const clientStocks = Array.isArray(body.stocks) ? body.stocks : [];
        let latestSheet = null;
        try {
          latestSheet = parseGoogleWorkbook(workbook);
        } catch {
          latestSheet = null;
        }
        let effectiveStocks = latestSheet ? latestSheet.stocks : clientStocks;
        let effectiveMovements = Array.isArray(body.movements) ? body.movements : [];
        if (body.movement && latestSheet) {
          const movementObj = body.movement;
          effectiveStocks = applyMovementToStocks(latestSheet.stocks, {
            ...movementObj,
            id: movementObj.id || `MOV-${Date.now()}`
          });
          authoritativeStocks = effectiveStocks;
        } else if (action === "SYNC_APP_DATA" && latestSheet && Array.isArray(body.replacementMovements) && (Array.isArray(body.sourceMovementIds) || Array.isArray(body.originalMovements))) {
          const sourceIds = new Set(
            Array.isArray(body.sourceMovementIds) ? body.sourceMovementIds.map((id) => String(id)) : []
          );
          const originals = Array.isArray(body.originalMovements) ? body.originalMovements : [];
          const replacementsList = body.replacementMovements;
          const matchedInSheet = latestSheet.movements.filter(
            (mov) => matchesOriginalMovement(mov, sourceIds, originals)
          );
          const baseToUndo = matchedInSheet.length > 0 ? matchedInSheet : originals;
          let recalculatedStocks = latestSheet.stocks;
          for (const oldMov of baseToUndo) {
            recalculatedStocks = undoMovementOnStocks(recalculatedStocks, oldMov);
          }
          for (const newMov of replacementsList) {
            recalculatedStocks = applyMovementToStocks(recalculatedStocks, newMov);
          }
          const remainingMovements = latestSheet.movements.filter(
            (mov) => !matchesOriginalMovement(mov, sourceIds, originals)
          );
          effectiveMovements = [...remainingMovements, ...replacementsList].sort(
            (a, b) => `${a.date} ${a.time || ""} ${a.id}`.localeCompare(
              `${b.date} ${b.time || ""} ${b.id}`
            )
          );
          effectiveStocks = recalculatedStocks;
          authoritativeStocks = effectiveStocks;
          authoritativeMovements = effectiveMovements;
        }
        const plan = action === "UPDATE_DASHBOARD_REMARK" && remark?.locationId ? planDashboardRemarkUpdate(
          workbook,
          remark.locationId,
          String(remark.value || "")
        ) : action === "SYNC_APP_DATA" ? planFullPersist(workbook, effectiveStocks, effectiveMovements) : body.movement ? planSheetWrites(
          workbook,
          body.movement,
          effectiveStocks
        ) : planStockPersist(workbook, effectiveStocks);
        appends = plan.appends;
        updates = plan.updates;
        replacements = "replacements" in plan ? plan.replacements : [];
      }
    } catch (error) {
      appends = [];
      updates = [];
      replacements = [];
      planningError = error instanceof Error ? error.message : "\uC2DC\uD2B8 \uAD6C\uC870\uB97C \uBD84\uC11D\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.";
    }
  }
  if (action === "DELETE_MOVEMENTS" && deletes.length === 0) {
    return { status: 400, json: { ok: false, error: "\uC0AD\uC81C\uD560 \uC2DC\uD2B8 \uD589 \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." } };
  }
  if (action === "SAVE_MOVEMENT" && appends.length === 0) {
    return {
      status: 422,
      json: {
        ok: false,
        error: "\uC2DC\uD2B8\uC5D0\uC11C \uC785\uCD9C\uACE0 \uB0B4\uC5ED\uC744 \uCD94\uAC00\uD560 \uD0ED\uC774\uB098 \uC5F4\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."
      }
    };
  }
  if (action === "UPDATE_DASHBOARD_REMARK" && updates.length !== 1) {
    return {
      status: 422,
      json: {
        ok: false,
        error: planningError || "Dashboard\uC5D0\uC11C \uC218\uC815\uD560 \uBE44\uACE0 \uC140\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."
      }
    };
  }
  if (action === "SYNC_APP_DATA" && replacements.length === 0) {
    return {
      status: 422,
      json: {
        ok: false,
        error: planningError || "\uC2DC\uD2B8\uC5D0\uC11C \uB3D9\uAE30\uD654\uD560 \uC6D0\uC7A5 \uB610\uB294 \uC7AC\uACE0 \uD45C\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uD0ED\uACFC \uD5E4\uB354\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694."
      }
    };
  }
  if (accessToken && (action === "DELETE_MOVEMENTS" || action === "SYNC_APP_DATA")) {
    return {
      status: 400,
      json: {
        ok: false,
        error: "\uC6D0\uC7A5 \uC804\uCCB4 \uB3D9\uAE30\uD654\uC640 \uD589 \uC0AD\uC81C\uB294 Apps Script \uC6F9\uC571 \uC5F0\uACB0\uC5D0\uC11C\uB9CC \uC9C0\uC6D0\uB429\uB2C8\uB2E4."
      }
    };
  }
  if (accessToken && SHEET_ID_PATTERN.test(sheetId) && (appends.length || updates.length)) {
    const data = [
      ...appends.map(
        (item) => ({
          range: `${quoteA1SheetName(item.sheetName)}!A${item.row}`,
          values: [item.values]
        })
      ),
      ...updates.map((item) => ({
        range: `${quoteA1SheetName(item.sheetName)}!${XLSX5.utils.encode_cell({
          r: item.row - 1,
          c: item.col - 1
        })}`,
        values: [[item.value]]
      }))
    ];
    const apiRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ valueInputOption: "USER_ENTERED", data })
      }
    );
    const apiText = await apiRes.text();
    if (!apiRes.ok) {
      throw new Error(`Google Sheets API \uC800\uC7A5 \uC2E4\uD328: ${apiText.slice(0, 300)}`);
    }
    return {
      status: 200,
      json: {
        ok: true,
        appendedCount: appends.length,
        updatedCount: updates.length,
        deletedCount: 0,
        appends: appends.map(
          ({ sheetName, row }) => ({ sheetName, row })
        )
      }
    };
  }
  const movementRows = {};
  for (const replacement of replacements) {
    replacement.movementIds.forEach((movementId, index) => {
      if (!movementRows[movementId]) movementRows[movementId] = [];
      movementRows[movementId].push({
        sheetName: replacement.sheetName,
        row: replacement.startRow + index
      });
    });
  }
  const response = await fetch(webhookUrl, {
    method: "POST",
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(5e4),
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
      "User-Agent": "Mozilla/5.0 SheetStockSync/1.0",
      "Cache-Control": "no-cache, no-store, max-age=0"
    },
    body: JSON.stringify({
      action,
      sheetId,
      movement: body.movement,
      stocks: authoritativeStocks || body.stocks,
      appends,
      updates,
      deletes,
      replacements
    })
  });
  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    if (parsed.ok === false) {
      return {
        status: 502,
        json: {
          ok: false,
          error: parsed.error || "Apps Script\uC5D0\uC11C \uC2DC\uD2B8 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."
        }
      };
    }
    if (typeof parsed.version !== "number" || parsed.version < 6 || typeof parsed.appendedCount !== "number" || typeof parsed.updatedCount !== "number" || typeof parsed.deletedCount !== "number") {
      return {
        status: 502,
        json: {
          ok: false,
          error: "Apps Script\uAC00 \uC774\uC804 \uBC84\uC804\uC785\uB2C8\uB2E4. \uC2DC\uD2B8 \uC124\uC815\uC5D0\uC11C \uCD5C\uC2E0 \uCF54\uB4DC\uB97C \uBCF5\uC0AC\uD574 \uC6F9 \uC571\uC744 \uC0C8 \uBC84\uC804\uC73C\uB85C \uC7AC\uBC30\uD3EC\uD558\uC138\uC694."
        }
      };
    }
    const expectedAppends = appends.length + replacements.reduce((count, replacement) => count + replacement.values.length, 0);
    const expectedUpdates = updates.length;
    const expectedDeletes = deletes.length + replacements.reduce((count, replacement) => count + replacement.clearRowCount, 0);
    if (parsed.appendedCount !== expectedAppends || parsed.updatedCount !== expectedUpdates || parsed.deletedCount !== expectedDeletes) {
      return {
        status: 502,
        json: {
          ok: false,
          error: `\uC2DC\uD2B8 \uBC18\uC601 \uAC74\uC218\uAC00 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uCD94\uAC00 ${parsed.appendedCount}/${expectedAppends}, \uC218\uC815 ${parsed.updatedCount}/${expectedUpdates}, \uC0AD\uC81C ${parsed.deletedCount}/${expectedDeletes}`
        }
      };
    }
    return {
      status: 200,
      json: {
        ...parsed,
        appends: appends.map(
          ({ sheetName, row }) => ({ sheetName, row })
        ),
        movementRows,
        ...authoritativeStocks ? { stocks: authoritativeStocks } : {},
        ...authoritativeMovements ? { movements: authoritativeMovements } : {}
      }
    };
  } catch {
    return {
      status: 502,
      json: {
        ok: false,
        error: explainAppsScriptResponse(text)
      }
    };
  }
}
function saveErrorResult(error) {
  return {
    status: 502,
    json: {
      ok: false,
      error: error instanceof Error && error.name === "TimeoutError" ? "Apps Script \uC751\uB2F5 \uC2DC\uAC04\uC774 \uCD08\uACFC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uCD5C\uC2E0 \uCF54\uB4DC\uB97C \uC7AC\uBC30\uD3EC\uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694." : error instanceof Error ? `\uC2DC\uD2B8 \uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4: ${error.message}` : "\uC2DC\uD2B8 \uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
    }
  };
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

// server/app.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var rootDir = path.resolve(__dirname, "..");
var isProduction = process.env.NODE_ENV === "production";
var PORT = Number(process.env.PORT) || 3e3;
var HOST = "0.0.0.0";
async function createServer() {
  const app = express();
  app.use(express.json({ limit: "15mb" }));
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });
  app.post("/api/google-sheet-save", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    try {
      const result = await handleGoogleSheetSave(req.body || {});
      res.status(result.status).json(result.json);
    } catch (error) {
      const result = saveErrorResult(error);
      res.status(result.status).json(result.json);
    }
  });
  app.get("/api/google-sheet/:sheetId", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    const rawSheetId = req.params.sheetId || "";
    try {
      const result = await handleGoogleSheetExport(rawSheetId);
      if ("buffer" in result) {
        res.status(result.status);
        res.setHeader("Content-Type", result.contentType);
        res.end(result.buffer);
        return;
      }
      res.status(result.status).json(result.json);
    } catch (error) {
      const result = exportErrorResult(error);
      res.status(result.status).json(result.json);
    }
  });
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, host: HOST, port: PORT },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(rootDir, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
  return { app, port: PORT, host: HOST };
}
async function startServer() {
  const { app, port, host } = await createServer();
  app.listen(port, host, () => {
    console.log(`[Server] Running on http://${host}:${port} (mode: ${isProduction ? "production" : "development"})`);
  });
}
var isDirectCli = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isDirectCli) {
  startServer().catch((err) => {
    console.error("[Server] Fatal error starting server:", err);
    process.exit(1);
  });
}
export {
  createServer,
  startServer
};
