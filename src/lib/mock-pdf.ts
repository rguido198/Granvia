/**
 * Executive & Legal PDF Generator for La Gran Vía OS.
 *
 * Produces pixel-perfect, publication-grade legal contract PDFs matching
 * the official Plaza La Gran Vía Mexicali document layout (Serif legal font,
 * terracotta brand header, navy blue data tables, running headers/footers,
 * and standard dual signature blocks).
 */

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

const WIN_ANSI_OVERRIDES: Record<number, number> = {
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x2018: 0x91, // '
  0x2019: 0x92, // '
  0x201c: 0x93, // "
  0x201d: 0x94, // "
  0x2022: 0x95, // •
  0x2026: 0x85, // …
  0x2794: 0x2d, // ➔
  0x00c1: 0xc1, // Á
  0x00c9: 0xc9, // É
  0x00cd: 0xcd, // Í
  0x00d3: 0xd3, // Ó
  0x00da: 0xda, // Ú
  0x00d1: 0xd1, // Ñ
  0x00e1: 0xe1, // á
  0x00e9: 0xe9, // é
  0x00ed: 0xed, // í
  0x00f3: 0xf3, // ó
  0x00fa: 0xfa, // ú
  0x00f1: 0xf1, // ñ
  0x00bf: 0xbf, // ¿
  0x00a1: 0xa1, // ¡
};

function latin1Bytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    bytes[i] = code <= 0xff ? code : (WIN_ANSI_OVERRIDES[code] ?? 0x3f);
  }
  return bytes;
}

function wrapLine(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line];
  const words = line.split(" ");
  const out: string[] = [];
  let cur = "";
  for (const word of words) {
    const candidate = (cur + " " + word).trim();
    if (candidate.length > maxChars && cur) {
      out.push(cur);
      cur = word;
    } else {
      cur = candidate;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function cleanMarkdown(str: string): string {
  return str
    .replace(/➔/g, "->")
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/\*(.*?)\*/g, "$1")     // italic
    .replace(/^#{1,6}\s+/, "")        // headings
    .replace(/^-\s+\*\*(.*?)\*\*:/, "• $1:") // list bold prefix
    .replace(/^-\s+/, "• ");         // list bullet
}

export type LeaseContractPdfParams = {
  documentTitle?: string;
  subtitle?: string;
  tenantEntity: string;
  tradeName?: string | null;
  unitCode: string;
  sqm: number | string;
  currentEndDate: string;
  newStartDate: string;
  newEndDate: string;
  currentRent: string;
  newRent: string;
  escalationPct: string;
  clausesMarkdown: string;
  legalRepresentative?: string;
};

/**
 * Generates an executive, highly-styled legal contract PDF matching
 * La Gran Vía's official document template.
 */
export function generateContractPdf(params: LeaseContractPdfParams): Blob {
  const {
    documentTitle = "CONVENIO MODIFICATORIO DE ARRENDAMIENTO COMERCIAL",
    subtitle = "PLAZA COMERCIAL LIFESTYLE LA GRAN VÍA — MEXICALI, BAJA CALIFORNIA",
    tenantEntity,
    tradeName,
    unitCode,
    sqm,
    currentEndDate,
    newStartDate,
    newEndDate,
    currentRent,
    newRent,
    escalationPct,
    clausesMarkdown,
    legalRepresentative = "C. Sofía Morales Ruiz",
  } = params;

  const pageStreams: string[][] = [];
  let currentStream: string[] = [];
  let currentY = 740;
  const leftMargin = 40;
  const rightMargin = 572;
  const printableWidth = 532;
  const topY = 730;
  const bottomMargin = 50;

  function startNewPage() {
    if (currentStream.length > 0) {
      currentStream.push("ET");
      pageStreams.push(currentStream);
    }
    currentStream = [];
    currentY = topY;
  }

  startNewPage();

  // 1. MAIN TITLE SECTION (Page 1 Only)
  currentStream.push("BT");
  currentStream.push("0.659 0.365 0.196 rg"); // Terracotta #A85D32
  currentStream.push("/F2 13.5 Tf"); // Times-Bold

  // Title line 1
  currentStream.push(`54 ${currentY} Td`);
  currentStream.push(`(${pdfEscape(documentTitle)}) Tj`);
  currentY -= 17;

  // Title line 2 (Subtitle)
  currentStream.push("0 -17 Td");
  currentStream.push("/F2 9.5 Tf");
  currentStream.push(`(${pdfEscape(subtitle)}) Tj`);
  currentStream.push("ET");

  currentY -= 15;

  // Terracotta decorative separator line under title
  currentStream.push("0.659 0.365 0.196 RG 0.75 w");
  currentStream.push(`180 ${currentY} m 432 ${currentY} l S`);
  currentY -= 20;

  // 2. PREAMBLE PARAGRAPH
  const preamble = `CONVENIO MODIFICATORIO DE ARRENDAMIENTO COMERCIAL QUE CELEBRAN EN LA CIUDAD DE MEXICALI, BAJA CALIFORNIA, POR UNA PARTE DESARROLLADORA LA GRAN VÍA MEXICALI, S.A. DE C.V., REPRESENTADA EN ESTE ACTO POR SU APODERADO LEGAL ("ARRENDADOR"), Y POR LA OTRA PARTE LA SOCIEDAD MERCANTIL DENOMINADA ${tenantEntity.toUpperCase()}${tradeName ? `, OPERANDO BAJO EL NOMBRE COMERCIAL "${tradeName.toUpperCase()}"` : ""} ("ARRENDATARIO"); AL TENOR DE LAS SIGUIENTES SECCIONES Y CLÁUSULAS:`;

  currentStream.push("BT 0.15 0.15 0.15 rg /F1 8.5 Tf");
  const wrappedPreamble = wrapLine(preamble, 88);
  wrappedPreamble.forEach((line, i) => {
    if (i === 0) currentStream.push(`${leftMargin} ${currentY} Td`);
    else currentStream.push("0 -11.5 Td");
    currentStream.push(`(${pdfEscape(line)}) Tj`);
    currentY -= 11.5;
  });
  currentStream.push("ET");
  currentY -= 12;

  // 3. COMPARISON DATA TABLE (RESUMEN COMPARATIVO)
  // Table header
  currentStream.push("0.106 0.212 0.365 rg"); // Navy #1B365D
  currentStream.push(`${leftMargin} ${currentY - 16} ${printableWidth} 16 re f`);

  currentStream.push("BT 1 1 1 rg /F2 8 Tf");
  currentStream.push(`${leftMargin + 8} ${currentY - 11} Td (CONCEPTO MODIFICADO) Tj`);
  currentStream.push("140 0 Td (CONDICIÓN ANTERIOR) Tj");
  currentStream.push("160 0 Td (NUEVA CONDICIÓN CONVENIDA) Tj");
  currentStream.push("ET");
  currentY -= 16;

  const compRows = [
    ["Vigencia Contractual", `Vence ${currentEndDate}`, `${newStartDate} a ${newEndDate}`],
    ["Renta Mensual Base", currentRent, `${newRent} (${escalationPct})`],
    ["Disposiciones Inalteradas", "Matriz Big 5, CAM, Exclusividad", "Ratificadas en plena fuerza y vigor"],
  ];

  compRows.forEach((row, rowIndex) => {
    const bg = rowIndex % 2 === 1 ? "0.96 0.97 0.98" : "1 1 1";
    currentStream.push(`${bg} rg ${leftMargin} ${currentY - 16} ${printableWidth} 16 re f`);
    currentStream.push(`0.8 0.84 0.88 RG 0.4 w ${leftMargin} ${currentY - 16} ${printableWidth} 16 re S`);

    currentStream.push("BT 0.15 0.15 0.15 rg /F1 8 Tf");
    currentStream.push(`${leftMargin + 8} ${currentY - 11} Td (${pdfEscape(row[0])}) Tj`);
    currentStream.push(`140 0 Td (${pdfEscape(row[1])}) Tj`);
    currentStream.push(`160 0 Td (${pdfEscape(row[2])}) Tj`);
    currentStream.push("ET");
    currentY -= 16;
  });

  currentY -= 15;

  // 4. MAINTENANCE RESPONSIBILITY TABLE ("BIG 5")
  currentStream.push("BT 0.1 0.1 0.1 rg /F2 8.5 Tf");
  currentStream.push(`${leftMargin} ${currentY} Td (MATRIZ DE RESPONSABILIDAD DE MANTENIMIENTO - BIG 5) Tj ET`);
  currentY -= 14;

  currentStream.push("0.106 0.212 0.365 rg"); // Navy #1B365D
  currentStream.push(`${leftMargin} ${currentY - 16} ${printableWidth} 16 re f`);

  currentStream.push("BT 1 1 1 rg /F2 8 Tf");
  currentStream.push(`${leftMargin + 8} ${currentY - 11} Td (RUBRO DE INFRAESTRUCTURA) Tj`);
  currentStream.push("130 0 Td (RESPONSABLE) Tj");
  currentStream.push("120 0 Td (ALCANCE Y ESPECIFICACIONES TÉCNICAS) Tj");
  currentStream.push("ET");
  currentY -= 16;

  const maintRows = [
    ["Sistema de Climatización (HVAC)", "Compartida", "Ductos primarios/centrales (Arrendador); Mantenimiento preventivo, termostatos y evaps (Arrendatario)."],
    ["Techos e Impermeabilización", "Arrendador", "Mantenimiento estructural de losas superiores, cubiertas generales y sellado exterior pluvial."],
    ["Plomería e Instalaciones Sanitarias", "Arrendatario", "Instalaciones hidráulicas internas del local, desagües, trampas sanitarias, llaves y fregaderos."],
    ["Instalación Eléctrica", "Arrendatario", "Cableado interno derivado del centro de carga, tableros secundarios, circuitos y contactos."],
    ["Cristalería de Fachada", "Arrendatario", "Conservación, reposición y limpieza periódica de cristales templados perimetrales y canceles."],
  ];

  maintRows.forEach((row, rowIndex) => {
    const bg = rowIndex % 2 === 1 ? "0.96 0.97 0.98" : "1 1 1";
    currentStream.push(`${bg} rg ${leftMargin} ${currentY - 20} ${printableWidth} 20 re f`);
    currentStream.push(`0.8 0.84 0.88 RG 0.4 w ${leftMargin} ${currentY - 20} ${printableWidth} 20 re S`);

    currentStream.push("BT 0.15 0.15 0.15 rg /F1 7.5 Tf");
    currentStream.push(`${leftMargin + 6} ${currentY - 13} Td (${pdfEscape(row[0])}) Tj`);
    currentStream.push(`130 0 Td (${pdfEscape(row[1])}) Tj`);

    const wrappedTech = wrapLine(row[2], 56);
    if (wrappedTech.length > 1) {
      currentStream.push(`120 4 Td (${pdfEscape(wrappedTech[0])}) Tj`);
      currentStream.push(`0 -8 Td (${pdfEscape(wrappedTech[1])}) Tj`);
    } else {
      currentStream.push(`120 0 Td (${pdfEscape(row[2])}) Tj`);
    }
    currentStream.push("ET");
    currentY -= 20;
  });

  currentY -= 16;

  // 5. CLAUSES & LEGAL PROSE
  const lines = clausesMarkdown
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("[") && !l.startsWith("###"));

  for (const rawLine of lines) {
    const cleaned = cleanMarkdown(rawLine);

    if (cleaned.startsWith("1.") || cleaned.startsWith("2.") || cleaned.startsWith("3.") || cleaned.startsWith("4.") || cleaned.startsWith("CLÁUSULAS")) {
      if (currentY - 24 < bottomMargin) startNewPage();

      currentStream.push("BT 0.1 0.1 0.1 rg /F2 8.5 Tf");
      const wrappedHeading = wrapLine(cleaned, 84);
      wrappedHeading.forEach((hl, i) => {
        if (i === 0) currentStream.push(`${leftMargin} ${currentY} Td`);
        else currentStream.push("0 -11 Td");
        currentStream.push(`(${pdfEscape(hl)}) Tj`);
        currentY -= 11;
      });
      currentStream.push("ET");
      currentY -= 4;
    } else {
      const wrapped = wrapLine(cleaned, 88);
      for (const line of wrapped) {
        if (currentY - 11 < bottomMargin) startNewPage();

        currentStream.push("BT 0.2 0.2 0.2 rg /F1 8 Tf");
        currentStream.push(`${leftMargin} ${currentY} Td`);
        currentStream.push(`(${pdfEscape(line)}) Tj`);
        currentStream.push("ET");
        currentY -= 11;
      }
      currentY -= 3;
    }
  }

  // 6. FORMAL DUAL SIGNATURE BLOCK AT THE END
  if (currentY - 90 < bottomMargin) startNewPage();

  currentY -= 10;
  currentStream.push("BT 0.2 0.2 0.2 rg /F2 7.5 Tf");
  currentStream.push(`${leftMargin} ${currentY} Td (LEÍDO QUE FUE EL PRESENTE CONVENIO Y ENTERADAS PLENAMENTE LAS PARTES DE SU VALOR Y FUERZA LEGAL,) Tj ET`);
  currentY -= 10;
  currentStream.push("BT 0.2 0.2 0.2 rg /F2 7.5 Tf");
  currentStream.push(`${leftMargin} ${currentY} Td (LO RATIFICAN Y FIRMAN POR DUPLICADO EN LA CIUDAD DE MEXICALI, BAJA CALIFORNIA.) Tj ET`);
  currentY -= 35;

  // Signature Lines (Left: Landlord, Right: Tenant)
  currentStream.push("0.3 0.3 0.3 RG 0.6 w");
  currentStream.push(`50 ${currentY} m 240 ${currentY} l S`);
  currentStream.push(`330 ${currentY} m 520 ${currentY} l S`);
  currentY -= 12;

  // Landlord column
  currentStream.push("BT 0.1 0.1 0.1 rg /F2 8 Tf");
  currentStream.push(`50 ${currentY} Td (EL ARRENDADOR) Tj ET`);
  currentStream.push("BT 0.2 0.2 0.2 rg /F1 7.5 Tf");
  currentStream.push(`50 ${currentY - 10} Td (DESARROLLADORA LA GRAN VÍA MEXICALI, S.A. DE C.V.) Tj ET`);
  currentStream.push("BT 0.4 0.4 0.4 rg /F1 7 Tf");
  currentStream.push(`50 ${currentY - 20} Td (Apoderado Legal: Ing. Carlos Valenzuela) Tj ET`);
  currentStream.push(`50 ${currentY - 28} Td (Poder Notarial No. 14,892) Tj ET`);

  // Tenant column
  currentStream.push("BT 0.1 0.1 0.1 rg /F2 8 Tf");
  currentStream.push(`330 ${currentY} Td (EL ARRENDATARIO) Tj ET`);
  currentStream.push("BT 0.2 0.2 0.2 rg /F1 7.5 Tf");
  currentStream.push(`330 ${currentY - 10} Td (${pdfEscape(tenantEntity)}) Tj ET`);
  if (tradeName) {
    currentStream.push("BT 0.3 0.3 0.3 rg /F3 7.5 Tf");
    currentStream.push(`330 ${currentY - 20} Td ((${pdfEscape(tradeName)})) Tj ET`);
  }
  currentStream.push("BT 0.4 0.4 0.4 rg /F1 7 Tf");
  currentStream.push(`330 ${currentY - 28} Td (Representante Legal: ${pdfEscape(legalRepresentative)}) Tj ET`);
  currentStream.push(`330 ${currentY - 36} Td (Poder Notarial No. 6,419) Tj ET`);

  // Finalize current page stream
  if (currentStream.length > 0) pageStreams.push(currentStream);

  // 7. BUILD FULL MULTI-PAGE PDF WITH HEADERS & FOOTERS
  const totalPages = pageStreams.length;
  const objects: string[] = [];

  // 1 0 obj: Catalog
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";

  // 2 0 obj: Pages
  const kidsStr = Array.from({ length: totalPages }, (_, i) => `${3 + i * 2} 0 R`).join(" ");
  objects[2] = `<< /Type /Pages /Kids [${kidsStr}] /Count ${totalPages} >>`;

  const fontF1ObjNum = 3 + totalPages * 2;
  const fontF2ObjNum = fontF1ObjNum + 1;
  const fontF3ObjNum = fontF2ObjNum + 1;
  const fontF4ObjNum = fontF3ObjNum + 1;
  const fontF5ObjNum = fontF4ObjNum + 1;
  const totalObjCount = fontF5ObjNum;

  for (let i = 0; i < totalPages; i++) {
    const pageObjNum = 3 + i * 2;
    const contentObjNum = pageObjNum + 1;

    // Header and Footer draw commands
    const headerFooterCommands = [
      "0.796 0.835 0.882 RG 0.5 w",
      "40 756 m 572 756 l S",
      "BT /F4 7.5 Tf 0.4 0.4 0.4 rg 40 762 Td (CONVENIO MODIFICATORIO DE ARRENDAMIENTO COMERCIAL - EXPEDIENTE DIGITAL) Tj ET",
      "BT /F5 7.5 Tf 0.3 0.3 0.3 rg 380 762 Td (PLAZA LA GRAN VÍA MEXICALI | LOCAL 17) Tj ET",
      `BT /F4 7 Tf 0.5 0.5 0.5 rg 40 748 Td (ARRENDATARIO: ${pdfEscape(tenantEntity)} | NOMBRE COMERCIAL: ${pdfEscape(tradeName || tenantEntity)}) Tj ET`,
      `BT /F4 7 Tf 0.5 0.5 0.5 rg 520 748 Td (Página ${i + 1} de ${totalPages}) Tj ET`,
      "0.796 0.835 0.882 RG 0.5 w",
      "40 38 m 572 38 l S",
      "BT /F4 7 Tf 0.5 0.5 0.5 rg 40 26 Td (EXPEDIENTE LEGAL DIGITAL - LA GRAN VÍA OS) Tj ET",
      "BT /F5 7 Tf 0.5 0.5 0.5 rg 410 26 Td (DOCUMENTO CONTRACTUAL CONFIDENCIAL) Tj ET",
    ].join("\n");

    const fullStreamText = `${headerFooterCommands}\n${pageStreams[i].join("\n")}`;

    objects[pageObjNum] = `<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 ${fontF1ObjNum} 0 R /F2 ${fontF2ObjNum} 0 R /F3 ${fontF3ObjNum} 0 R /F4 ${fontF4ObjNum} 0 R /F5 ${fontF5ObjNum} 0 R >> >> /MediaBox [0 0 612 792] /Contents ${contentObjNum} 0 R >>`;
    objects[contentObjNum] = `<< /Length ${fullStreamText.length} >>\nstream\n${fullStreamText}\nendstream`;
  }

  objects[fontF1ObjNum] = "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>";
  objects[fontF2ObjNum] = "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>";
  objects[fontF3ObjNum] = "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic /Encoding /WinAnsiEncoding >>";
  objects[fontF4ObjNum] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[fontF5ObjNum] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (let i = 1; i <= totalObjCount; i++) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${totalObjCount + 1}\n0000000000 65535 f \n`;

  for (let i = 1; i <= totalObjCount; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${totalObjCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([latin1Bytes(pdf).buffer as ArrayBuffer], {
    type: "application/pdf",
  });
}

/** Legacy generator fallback */
export function generateMockPdf(
  title: string,
  sections: { heading?: string; body: string[] }[],
  footer?: string,
): Blob {
  return generateContractPdf({
    documentTitle: title,
    tenantEntity: "COMERCIALIZADORA DULCE AMANECER, S.A. DE C.V.",
    tradeName: "DONITAS DEL VALLE",
    unitCode: "Local 17",
    sqm: 68,
    currentEndDate: "2027-01-14",
    newStartDate: "2027-01-15",
    newEndDate: "2030-01-14",
    currentRent: "$32,300.00 MXN",
    newRent: "$32,300.00 MXN",
    escalationPct: "0%",
    clausesMarkdown: sections.flatMap((s) => s.body).join("\n"),
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
