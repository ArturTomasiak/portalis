import type {
  ApproachChannel,
  Berth,
  Crane,
  PortCondition,
  PortReport,
  Shipowner,
  StorageArea,
  Terminal,
} from "./queries";

type ReportField = [label: string, value: string | number | null | undefined];

type ZipFile = {
  name: string;
  content: Buffer;
};

function hasValue(value: string | number | null | undefined): value is string | number {
  return value !== null && value !== undefined && value !== "";
}

function boolLabel(value: number | null | undefined): string {
  return value ? "yes" : "no";
}

function formatNumber(value: number | null | undefined, suffix = ""): string | null {
  if (!hasValue(value)) return null;

  const rounded = Math.round(value * 10) / 10;
  return `${rounded}${suffix ? ` ${suffix}` : ""}`;
}

function formatArea(value: number | null | undefined): string | null {
  if (!hasValue(value)) return null;

  return `${Math.round(value).toLocaleString("en-US")} m²`;
}

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${pluralForm}`;
}

function monthRange(startMonth: number | null, endMonth: number | null): string | null {
  if (!startMonth && !endMonth) return null;
  if (startMonth && endMonth) return `${startMonth}-${endMonth}`;
  if (startMonth) return `from month ${startMonth}`;
  return `to month ${endMonth}`;
}

function fieldList(fields: ReportField[]): string {
  return fields
    .filter(([, value]) => hasValue(value))
    .map(([label, value]) => `${label}: ${value}`)
    .join("; ");
}

function reportRow(title: string, fields: ReportField[]): string {
  const values = fieldList(fields);
  return values ? `- ${title}: ${values}.` : `- ${title}.`;
}

function addSection(lines: string[], title: string, rows: string[]): void {
  if (rows.length === 0) return;

  lines.push("");
  lines.push(title);
  lines.push(...rows);
}

function maxOf<T>(items: T[], selector: (item: T) => number | null | undefined): number | null {
  const values = items
    .map(selector)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return values.length > 0 ? Math.max(...values) : null;
}

function minOf<T>(items: T[], selector: (item: T) => number | null | undefined): number | null {
  const values = items
    .map(selector)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return values.length > 0 ? Math.min(...values) : null;
}

function sumOf<T>(items: T[], selector: (item: T) => number | null | undefined): number {
  return items.reduce((total, item) => total + (selector(item) ?? 0), 0);
}

function formatCoordinates(latitude: number | null, longitude: number | null): string | null {
  if (!hasValue(latitude) || !hasValue(longitude)) return null;

  return `${latitude}, ${longitude}`;
}

function buildExecutiveSummary(report: PortReport): string[] {
  const { port, terminals, berths, storageAreas, cranes, approachChannels } = report;

  const operationalCranes = cranes.filter((crane) => crane.operational);
  const totalStorageArea = sumOf(storageAreas, (storage) => storage.area_m2);
  const maxBerthLoa = maxOf(berths, (berth) => berth.max_loa_m);
  const maxBerthDraft = maxOf(berths, (berth) => berth.max_draft_m);
  const deepestBerth = maxOf(berths, (berth) => berth.depth_m);
  const mostRestrictiveApproachDraft = minOf(approachChannels, (channel) => channel.max_draft_m);
  const maxCraneLift = maxOf(operationalCranes, (crane) => crane.max_lift_t);
  const roRoBerths = berths.filter((berth) => berth.has_ro_ro).length;
  const railBerths = berths.filter((berth) => berth.has_rail_access).length;

  const lines: string[] = [];

  lines.push(
    `- ${port.name} is represented in the database as a ${port.country} port with ${
      terminals.length > 0 ? plural(terminals.length, "terminal", "terminals") : "no recorded terminals"
    }, ${berths.length > 0 ? plural(berths.length, "berth", "berths") : "no recorded berths"}, ${
      operationalCranes.length > 0
        ? plural(operationalCranes.length, "operational crane", "operational cranes")
        : "no recorded operational cranes"
    }.`,
  );

  if (maxBerthLoa || maxBerthDraft || deepestBerth) {
    lines.push(
      `- The recorded berth envelope suggests a maximum alongside capability of ${
        maxBerthLoa ? `LOA ${formatNumber(maxBerthLoa, "m")}` : "LOA not recorded"
      }, ${
        maxBerthDraft ? `vessel draft ${formatNumber(maxBerthDraft, "m")}` : "vessel draft not recorded"
      }, and ${
        deepestBerth ? `berth depth ${formatNumber(deepestBerth, "m")}` : "berth depth not recorded"
      }. These values should be treated as planning indicators and verified against port authority limits, tide, under-keel clearance and pilotage requirements before nomination.`,
    );
  } else {
    lines.push(
      "- The database does not contain usable berth dimension limits for this port, so vessel compatibility cannot be confirmed from the seeded data alone.",
    );
  }

  if (mostRestrictiveApproachDraft) {
    lines.push(
      `- The most restrictive recorded approach-channel draft is ${formatNumber(
        mostRestrictiveApproachDraft,
        "m",
      )}. If this is lower than the berth draft capability, the approach may become the controlling nautical limitation rather than the quay itself.`,
    );
  } else if (approachChannels.length > 0) {
    lines.push(
      "- Approach channels are recorded, but draft limits are incomplete. Marine access should therefore be checked against nautical publications, pilot information and current port notices.",
    );
  } else {
    lines.push(
      "- No approach-channel data is seeded for this port. Any operational report should therefore be supplemented with nautical chart, pilotage and port-authority information.",
    );
  }

  if (maxCraneLift) {
    lines.push(
      `- Recorded lifting capability reaches up to ${formatNumber(
        maxCraneLift,
        "t",
      )} on operational cranes. This is useful for early screening of heavy project cargo, but final lifting feasibility still depends on outreach, hook height, lift radius, ground pressure, rigging plan and crane availability.`,
    );
  } else {
    lines.push(
      "- The seed data does not confirm operational lifting capacity. Heavy-lift or project-cargo suitability must be checked directly with the terminal/operator.",
    );
  }

  if (totalStorageArea > 0) {
    lines.push(
      `- The port has ${formatArea(
        totalStorageArea,
      )} of recorded storage area. This indicates possible laydown capacity, but cargo planning still needs confirmation of ground bearing pressure, oversized cargo acceptance, covered storage and internal transport routes.`,
    );
  } else {
    lines.push(
      "- No usable storage area is recorded. The report cannot confirm laydown capacity for pre-assembly, offshore wind components or other project cargo.",
    );
  }

  if (roRoBerths > 0 || railBerths > 0) {
    lines.push(
      `- Intermodal indicators: ${plural(roRoBerths, "berth", "berths")} with Ro-Ro capability and ${plural(
        railBerths,
        "berth",
        "berths",
      )} with rail access are recorded. These may affect cargo routing, trailer moves and hinterland logistics.`,
    );
  }

  if (port.has_freezing_risk) {
    lines.push(
      `- Freezing risk is flagged for this port${
        port.freezing_notes ? `: ${port.freezing_notes}` : ""
      }. Winter calls may require additional checks for ice, reduced productivity, access restrictions and cargo protection.`,
    );
  }

  return lines;
}

function terminalLine(terminal: Terminal): string {
  return reportRow(terminal.name, [
    ["operator", terminal.operator_name],
    ["terminal role", terminal.terminal_type],
    ["position", formatCoordinates(terminal.latitude, terminal.longitude)],
    ["operational note", terminal.notes],
  ]);
}

function berthLine(berth: Berth): string {
  const implications: string[] = [];

  if (berth.max_draft_m) implications.push(`draft up to ${formatNumber(berth.max_draft_m, "m")}`);
  if (berth.max_loa_m) implications.push(`LOA up to ${formatNumber(berth.max_loa_m, "m")}`);
  if (berth.quay_load_t_per_m2) implications.push(`quay load ${formatNumber(berth.quay_load_t_per_m2, "t/m²")}`);
  if (berth.has_ro_ro) implications.push("Ro-Ro cargo possible");
  if (berth.has_rail_access) implications.push("rail access");
  if (berth.has_road_access) implications.push("road access");

  return reportRow(`${berth.terminal_name} / ${berth.name}`, [
    ["marine use", implications.length > 0 ? implications.join(", ") : "limits not fully recorded"],
    ["berth length", formatNumber(berth.length_m, "m")],
    ["water depth", formatNumber(berth.depth_m, "m")],
    ["max beam", formatNumber(berth.max_beam_m, "m")],
    ["max DWT", formatNumber(berth.max_dwt_t, "t")],
    ["note", berth.notes],
  ]);
}

function storageLine(storage: StorageArea): string {
  const suitability: string[] = [];

  if (storage.oversized_allowed) suitability.push("oversized cargo");
  if (storage.hazardous_allowed) suitability.push("hazardous cargo");
  if (storage.covered) suitability.push("weather-protected cargo");
  if (storage.has_reefer_power) suitability.push("reefer cargo");

  return reportRow(`${storage.terminal_name} / ${storage.name}`, [
    ["storage role", storage.storage_type],
    ["area", formatArea(storage.area_m2)],
    ["suitable indicators", suitability.length > 0 ? suitability.join(", ") : "standard/open storage or not specified"],
    ["ground load", formatNumber(storage.max_load_t_per_m2, "t/m²")],
    ["max item envelope", buildCargoEnvelope(storage)],
    ["max item weight", formatNumber(storage.max_item_weight_t, "t")],
    ["position", formatCoordinates(storage.latitude, storage.longitude)],
    ["note", storage.notes],
  ]);
}

function buildCargoEnvelope(storage: StorageArea): string | null {
  const dimensions = [
    formatNumber(storage.max_item_length_m, "m"),
    formatNumber(storage.max_item_width_m, "m"),
    formatNumber(storage.max_item_height_m, "m"),
  ];

  if (dimensions.every((dimension) => dimension === null)) return null;

  return dimensions.map((dimension) => dimension ?? "not recorded").join(" x ");
}

function craneLine(crane: Crane): string {
  const status = crane.operational ? "operational" : "not confirmed operational";
  const mobility = crane.mobile ? "mobile" : "fixed/static";

  return reportRow(crane.name, [
    ["location", [crane.terminal_name, crane.berth_name].filter(Boolean).join(" / ")],
    ["type", crane.type],
    ["status", `${status}, ${mobility}`],
    ["safe working load indicator", formatNumber(crane.max_lift_t, "t")],
    ["outreach", formatNumber(crane.outreach_m, "m")],
    ["hook height", formatNumber(crane.hook_height_m, "m")],
    ["planning implication", buildCraneImplication(crane)],
    ["note", crane.notes],
  ]);
}

function buildCraneImplication(crane: Crane): string | null {
  if (!crane.operational) {
    return "not suitable for planning unless availability is confirmed";
  }

  if (crane.max_lift_t && crane.max_lift_t >= 100) {
    return "potentially relevant for heavy project cargo, subject to lift radius and rigging study";
  }

  if (crane.max_lift_t && crane.max_lift_t >= 40) {
    return "potentially relevant for medium-heavy cargo and port handling";
  }

  if (crane.max_lift_t) {
    return "mainly relevant for lighter cargo handling";
  }

  return null;
}

function approachLine(channel: ApproachChannel): string {
  const restrictions: string[] = [];

  if (channel.pilot_required) restrictions.push("pilotage required");
  if (channel.tug_required) restrictions.push("tug assistance required");

  return reportRow(channel.name, [
    ["nautical role", restrictions.length > 0 ? restrictions.join(", ") : "no compulsory pilot/tug flag in seed data"],
    ["channel depth", formatNumber(channel.depth_m, "m")],
    ["channel width", formatNumber(channel.width_m, "m")],
    ["max LOA", formatNumber(channel.max_loa_m, "m")],
    ["max beam", formatNumber(channel.max_beam_m, "m")],
    ["max draft", formatNumber(channel.max_draft_m, "m")],
    ["max air draft", formatNumber(channel.max_air_draft_m, "m")],
    ["planning note", channel.notes],
  ]);
}

function conditionLine(condition: PortCondition): string {
  return reportRow(condition.condition_type, [
    ["season", monthRange(condition.start_month, condition.end_month)],
    ["severity", condition.severity],
    ["operational implication", condition.description],
  ]);
}

function shipownerLine(shipowner: Shipowner): string {
  return reportRow(shipowner.name, [
    ["address", shipowner.full_address],
    ["email", shipowner.email],
    ["website", shipowner.website],
  ]);
}

function buildDataCoverageNote(report: PortReport): string[] {
  const missing: string[] = [];

  if (report.berths.length === 0) missing.push("berth limits");
  if (report.approachChannels.length === 0) missing.push("approach-channel limits");
  if (report.cranes.length === 0) missing.push("crane capacity");
  if (report.storageAreas.length === 0) missing.push("storage/laydown capacity");
  if (report.conditions.length === 0) missing.push("seasonal operating conditions");

  const lines = [
    "- This document is generated only from the data currently seeded in the SQLite database.",
    "- The report is suitable for early screening and internal comparison, not for final vessel nomination or cargo execution.",
    "- Before a real port call, confirm all nautical limits, crane availability, berth booking, pilotage, tug requirements, weather restrictions, tariffs and terminal operating procedures with the port/operator.",
  ];

  if (missing.length > 0) {
    lines.unshift(`- Important data gaps for this port: ${missing.join(", ")}.`);
  }

  return lines;
}

export function buildPortReportLines(report: PortReport): string[] {
  const { port } = report;

  const lines: string[] = [
    `Port operational report: ${port.name}`,
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "Executive maritime summary",
    ...buildExecutiveSummary(report),
    "",
    "Port identity",
    reportRow(port.name, [
      ["UN/LOCODE", port.unlocode],
      ["country", port.country],
      ["position", formatCoordinates(port.latitude, port.longitude)],
      ["website", port.website],
      ["freezing risk", boolLabel(port.has_freezing_risk)],
      ["freezing note", port.freezing_notes],
      ["general note", port.notes],
    ]),
  ];

  addSection(lines, "Terminal structure", report.terminals.map(terminalLine));

  addSection(lines, "Berths and vessel acceptance indicators", [
    "- Berth figures describe the recorded quay-side capability. They do not replace port-authority approval, under-keel-clearance checks, tidal windows or pilot restrictions.",
    ...report.berths.map(berthLine),
  ]);

  addSection(lines, "Cargo handling and lifting capability", [
    "- Crane figures are useful for screening cargo feasibility. Actual lifting plans still depend on lift radius, rigging, ground pressure, wind limits, operator availability and terminal procedures.",
    ...report.cranes.map(craneLine),
  ]);

  addSection(lines, "Storage, laydown and cargo protection", [
    "- Storage records indicate whether the port may support laydown, temporary storage, pre-assembly or weather-sensitive cargo. Ground bearing and cargo dimensions must be verified for project cargo.",
    ...report.storageAreas.map(storageLine),
  ]);

  addSection(lines, "Marine approach, pilotage and access restrictions", [
    "- Approach data is often the controlling factor for larger vessels. A berth may physically fit a vessel while the fairway, draft, air draft, pilotage or tug rules still restrict the call.",
    ...report.approachChannels.map(approachLine),
  ]);

  addSection(lines, "Weather, seasonal and operational conditions", [
    "- These records highlight operating risks that may affect schedule, productivity or safe access.",
    ...report.conditions.map(conditionLine),
  ]);

  addSection(lines, "Linked shipowners or commercial contacts", report.shipowners.map(shipownerLine));

  addSection(lines, "Data coverage and operational caveats", buildDataCoverageNote(report));

  return lines;
}

export function safeFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function docxParagraph(line: string, index: number): string {
  if (line === "") {
    return "<w:p/>";
  }

  const isTitle = index === 0;
  const isHeading = !line.startsWith("-") && index > 1;

  const runProperties = isTitle
    ? '<w:rPr><w:b/><w:sz w:val="32"/></w:rPr>'
    : isHeading
      ? '<w:rPr><w:b/><w:sz w:val="24"/></w:rPr>'
      : "";

  const spacing =
    isHeading || isTitle
      ? '<w:pPr><w:spacing w:before="180" w:after="80"/></w:pPr>'
      : "";

  return `<w:p>${spacing}<w:r>${runProperties}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`;
}

export function createDocxBuffer(report: PortReport): Buffer {
  const lines = buildPortReportLines(report);

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${lines.map(docxParagraph).join("\n")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  return createZip([
    {
      name: "[Content_Types].xml",
      content: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
        "utf8",
      ),
    },
    {
      name: "_rels/.rels",
      content: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
        "utf8",
      ),
    },
    {
      name: "word/document.xml",
      content: Buffer.from(documentXml, "utf8"),
    },
  ]);
}

function createZip(files: ZipFile[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];

  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const crc = crc32(file.content);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(file.content.length, 18);
    localHeader.writeUInt32LE(file.content.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, name, file.content);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(file.content.length, 20);
    centralHeader.writeUInt32LE(file.content.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + file.content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localFiles = Buffer.concat(localParts);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localFiles.length, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([localFiles, centralDirectory, end]);
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function asciiForPdf(value: string): string {
  return value
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ź/g, "z")
    .replace(/ż/g, "z")
    .replace(/Ą/g, "A")
    .replace(/Ć/g, "C")
    .replace(/Ę/g, "E")
    .replace(/Ł/g, "L")
    .replace(/Ń/g, "N")
    .replace(/Ó/g, "O")
    .replace(/Ś/g, "S")
    .replace(/Ź/g, "Z")
    .replace(/Ż/g, "Z")
    .replace(/[–—]/g, "-")
    .replace(/²/g, "2")
    .replace(/°/g, " deg ")
    .replace(/[^\x20-\x7E]/g, "");
}

function wrapLine(line: string, maxLength = 96): string[] {
  if (line.length <= maxLength) return [line];

  const words = line.split(" ");
  const wrapped: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length > maxLength) {
      if (current) wrapped.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) wrapped.push(current);

  return wrapped;
}

function escapePdfString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function createPdfBuffer(report: PortReport): Buffer {
  const lines = buildPortReportLines(report)
    .map(asciiForPdf)
    .flatMap((line) => wrapLine(line));

  const pageLineLimit = 48;
  const pages: string[][] = [];

  for (let index = 0; index < lines.length; index += pageLineLimit) {
    pages.push(lines.slice(index, index + pageLineLimit));
  }

  if (pages.length === 0) pages.push(["No report data available."]);

  const objects: string[] = [];
  const pageObjectNumbers = pages.map((_, index) => 3 + index * 2);
  const contentObjectNumbers = pages.map((_, index) => 4 + index * 2);
  const fontObjectNumber = 3 + pages.length * 2;

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers
    .map((number) => `${number} 0 R`)
    .join(" ")}] /Count ${pages.length} >>`;

  pages.forEach((page, index) => {
    const pageObjectNumber = pageObjectNumbers[index];
    const contentObjectNumber = contentObjectNumbers[index];

    objects[pageObjectNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;

    const stream = [
      "BT",
      "/F1 10 Tf",
      "50 800 Td",
      "14 TL",
      ...page.map((line) => `(${escapePdfString(line)}) Tj T*`),
      "ET",
    ].join("\n");

    objects[contentObjectNumber] =
      `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`;
  });

  objects[fontObjectNumber] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let body = "%PDF-1.4\n";
  const offsets = [0];

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = Buffer.byteLength(body, "utf8");
    body += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(body, "utf8");

  body += `xref\n0 ${objects.length}\n`;
  body += "0000000000 65535 f \n";

  for (let index = 1; index < objects.length; index += 1) {
    body += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  body += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(body, "utf8");
}