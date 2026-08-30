"use client";

/**
 * Renders Mariana's/lease-renewal's generated draft_markdown as actual
 * formatted text instead of a raw <pre> dump — both lease-renewal-panel.tsx
 * and lease-application-review.tsx used to render the literal "###"/"**"
 * characters verbatim (see git history for both).
 *
 * Not a general markdown parser: the drafts this renders come from two
 * fixed, known templates (RENEWAL_SYSTEM_PROMPT in
 * workers/workflows/src/lease-renewal.ts and MARIANA_SYSTEM_PROMPT in
 * mariana-screening.ts), so this only needs to handle the constructs those
 * templates actually produce — #/## headings, **bold** inline, plain
 * paragraphs — not arbitrary markdown. A real parser (react-markdown, etc.)
 * would be overkill for a closed, template-constrained input.
 *
 * The one-line jurisdiction watermark (root CLAUDE.md §4 — literally
 * "[DRAFT — PENDING LANDLORD COUNSEL SIGN-OFF ON UNRESOLVED JURISDICTION
 * KEYS: ...]", always the first line when present) is pulled out of the flow
 * entirely and rendered as its own amber banner, matching the treatment
 * Diego's and Mariana's own unresolved-keys banners already get elsewhere —
 * previously it was just the first line of raw text, easy to miss.
 */

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    return part ? <span key={`${keyPrefix}-${i}`}>{part}</span> : null;
  });
}

export function LegalDraftMarkdown({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const watermarkLine = lines[0]?.trim().startsWith("[") && lines[0].trim().endsWith("]") ? lines[0].trim() : null;
  const bodyLines = watermarkLine ? lines.slice(1) : lines;

  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];

  function flushParagraph(key: string) {
    if (paragraph.length === 0) return;
    const text = paragraph.join(" ").trim();
    if (text) {
      blocks.push(
        <p key={key} className="mt-2 first:mt-0">
          {renderInline(text, key)}
        </p>,
      );
    }
    paragraph = [];
  }

  bodyLines.forEach((rawLine, i) => {
    const line = rawLine.trim();
    const h4 = line.match(/^####\s+(.*)/);
    const h3 = line.match(/^###\s+(.*)/);
    if (h4) {
      flushParagraph(`p-${i}`);
      blocks.push(
        <h4 key={`h4-${i}`} className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500 first:mt-0">
          {renderInline(h4[1], `h4-${i}`)}
        </h4>,
      );
    } else if (h3) {
      flushParagraph(`p-${i}`);
      blocks.push(
        <h3 key={`h3-${i}`} className="mt-4 text-sm font-bold text-slate-900 first:mt-0">
          {renderInline(h3[1], `h3-${i}`)}
        </h3>,
      );
    } else if (line === "") {
      flushParagraph(`p-${i}`);
    } else {
      paragraph.push(line);
    }
  });
  flushParagraph("p-end");

  return (
    <div className="text-ink-700 leading-relaxed">
      {watermarkLine && (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
          {watermarkLine}
        </div>
      )}
      {blocks}
    </div>
  );
}
