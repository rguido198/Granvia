/**
 * Minimal, dependency-free PDF generator for demo mockups.
 *
 * Builds a genuinely openable single-page PDF (Helvetica text, WinAnsi
 * encoding) so the AI Leasing Agent demo can hand the presenter a real file
 * to open on stage instead of an alert() placeholder. Not meant for
 * production documents — no pagination, no rich layout.
 */

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** PDF string literals are raw bytes; this maps the JS string 1:1 onto Latin-1/WinAnsi. */
function latin1Bytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    bytes[i] = code <= 0xff ? code : 0x3f;
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

export type PdfSection = { heading?: string; body: string[] };

/** Generates a one-page PDF: a bold title, then sections of wrapped body text. */
export function generateMockPdf(
  title: string,
  sections: PdfSection[],
  footer?: string,
): Blob {
  const content: string[] = ["BT", "/F2 19 Tf", "72 738 Td", `(${pdfEscape(title)}) Tj`];
  let firstBlock = true;

  for (const section of sections) {
    content.push(firstBlock ? "0 -34 Td" : "0 -26 Td");
    firstBlock = false;
    if (section.heading) {
      content.push("/F2 12 Tf");
      content.push(`(${pdfEscape(section.heading)}) Tj`);
      content.push("/F1 10.5 Tf");
      content.push("0 -17 Td");
    }
    const wrapped = section.body.flatMap((line) => wrapLine(line, 92));
    wrapped.forEach((line, i) => {
      if (i > 0) content.push("0 -15 Td");
      content.push(`(${pdfEscape(line)}) Tj`);
    });
  }

  if (footer) {
    content.push("0 -30 Td");
    content.push("/F1 8 Tf");
    content.push(`(${pdfEscape(footer)}) Tj`);
  }
  content.push("ET");
  const contentStream = content.join("\n");

  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objects[3] =
    "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /MediaBox [0 0 612 792] /Contents 6 0 R >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[5] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  objects[6] = `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 1; i <= 6; i++) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += "xref\n0 7\n0000000000 65535 f \n";
  for (let i = 1; i <= 6; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

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
