/**
 * Dependency-free PDF generator for contract proposals and lease addendums.
 *
 * Supports multi-page pagination, clean Markdown stripping, wrapped headings/titles,
 * and standard WinAnsi encoding.
 */

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Typographic punctuation Spanish prose uses mapped explicitly to WinAnsi slots.
 */
const WIN_ANSI_OVERRIDES: Record<number, number> = {
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x2018: 0x91, // '
  0x2019: 0x92, // '
  0x201c: 0x93, // "
  0x201d: 0x94, // "
  0x2022: 0x95, // •
  0x2026: 0x85, // …
  0x2794: 0x2d, // ➔ (replace arrow with -)
};

/** PDF string literals are raw bytes; this maps the JS string 1:1 onto Latin-1/WinAnsi. */
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

export type PdfSection = { heading?: string; body: string[] };

/** Generates a formatted multi-page PDF document. */
export function generateMockPdf(
  title: string,
  sections: PdfSection[],
  footer?: string,
): Blob {
  const pageStreams: string[][] = [];
  let currentStream: string[] = [];
  let currentY = 738;
  const leftMargin = 54;
  const topY = 738;
  const bottomMargin = 54;

  function startNewPage() {
    if (currentStream.length > 0) {
      currentStream.push("ET");
      pageStreams.push(currentStream);
    }
    currentStream = ["BT", "/F1 10 Tf", `${leftMargin} ${topY} Td`];
    currentY = topY;
  }

  startNewPage();

  // Draw Title (15pt Helvetica-Bold)
  currentStream.push("/F2 15 Tf");
  const wrappedTitle = wrapLine(cleanMarkdown(title), 44);
  wrappedTitle.forEach((line, i) => {
    if (i > 0) {
      currentStream.push("0 -19 Td");
      currentY -= 19;
    }
    currentStream.push(`(${pdfEscape(line)}) Tj`);
  });

  currentStream.push("0 -24 Td");
  currentY -= 24;

  for (const section of sections) {
    if (section.heading) {
      const cleanedHeading = cleanMarkdown(section.heading);
      const wrappedHeading = wrapLine(cleanedHeading, 52);
      const headingHeight = wrappedHeading.length * 15 + 8;

      if (currentY - headingHeight < bottomMargin) {
        startNewPage();
      }

      currentStream.push("/F2 11 Tf");
      wrappedHeading.forEach((line, i) => {
        if (i > 0) {
          currentStream.push("0 -15 Td");
          currentY -= 15;
        }
        currentStream.push(`(${pdfEscape(line)}) Tj`);
      });

      currentStream.push("/F1 10 Tf");
      currentStream.push("0 -15 Td");
      currentY -= 15;
    }

    for (const rawLine of section.body) {
      const cleaned = cleanMarkdown(rawLine);
      const wrapped = wrapLine(cleaned, 72);

      for (const line of wrapped) {
        if (currentY - 14 < bottomMargin) {
          startNewPage();
        }
        currentStream.push(`(${pdfEscape(line)}) Tj`);
        currentStream.push("0 -14 Td");
        currentY -= 14;
      }

      if (currentY - 4 >= bottomMargin) {
        currentStream.push("0 -4 Td");
        currentY -= 4;
      }
    }

    if (currentY - 10 >= bottomMargin) {
      currentStream.push("0 -10 Td");
      currentY -= 10;
    }
  }

  if (footer) {
    if (currentY - 20 < bottomMargin) {
      startNewPage();
    }
    currentStream.push("/F1 8 Tf");
    currentStream.push(`(${pdfEscape(cleanMarkdown(footer))}) Tj`);
  }

  currentStream.push("ET");
  pageStreams.push(currentStream);

  // Build PDF 1.4 objects dynamically
  const totalPages = pageStreams.length;
  const fontF1ObjNum = 3 + totalPages * 2;
  const fontF2ObjNum = fontF1ObjNum + 1;
  const totalObjCount = fontF2ObjNum;

  const objects: string[] = [];

  // 1 0 obj: Catalog
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";

  // 2 0 obj: Pages
  const kidsStr = Array.from({ length: totalPages }, (_, i) => `${3 + i * 2} 0 R`).join(" ");
  objects[2] = `<< /Type /Pages /Kids [${kidsStr}] /Count ${totalPages} >>`;

  for (let i = 0; i < totalPages; i++) {
    const pageObjNum = 3 + i * 2;
    const contentObjNum = pageObjNum + 1;
    const streamText = pageStreams[i].join("\n");

    objects[pageObjNum] = `<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 ${fontF1ObjNum} 0 R /F2 ${fontF2ObjNum} 0 R >> >> /MediaBox [0 0 612 792] /Contents ${contentObjNum} 0 R >>`;
    objects[contentObjNum] = `<< /Length ${streamText.length} >>\nstream\n${streamText}\nendstream`;
  }

  objects[fontF1ObjNum] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[fontF2ObjNum] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

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
