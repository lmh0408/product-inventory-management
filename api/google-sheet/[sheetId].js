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
