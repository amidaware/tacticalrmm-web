import DOMPurify from "dompurify";

// Lightweight, dependency-free markdown -> HTML for the AI builder/chat windows so the
// assistant's replies render nicely (headings, bold, lists, code) instead of showing raw
// ** and ## and -. Output is sanitized with DOMPurify before it hits v-html.
function esc(s: string): string {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(s: string): string {
  return s
    .replace(
      /`([^`]+)`/g,
      '<code style="background:#eceef1;border-radius:3px;padding:1px 5px;font-family:Consolas,Monaco,monospace;font-size:12.5px">$1</code>',
    )
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/__([^_]+)__/g, "<b>$1</b>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener" style="color:#1a73e8">$1</a>',
    );
}

export function renderMarkdown(src: string): string {
  const blocks: string[] = [];
  let work = String(src || "").replace(/```([^\n]*)\n([\s\S]*?)```/g, (_f, _lang, code) => {
    const k = "\u0000B" + blocks.length + "\u0000";
    blocks.push(
      '<pre style="background:#1e1e1e;color:#d4d4d4;padding:10px 12px;border-radius:6px;' +
        'font-family:Consolas,Monaco,monospace;font-size:12.5px;line-height:1.5;white-space:pre-wrap;' +
        'overflow-x:auto;margin:8px 0">' +
        esc(code) +
        "</pre>",
    );
    return "\n\n" + k + "\n\n";
  });

  const lines = work.split(/\n/);
  const out: string[] = [];
  let i = 0;
  let para: string[] = [];
  const flush = () => {
    if (para.length) {
      out.push('<p style="margin:0 0 9px">' + para.map((l) => inline(esc(l))).join("<br/>") + "</p>");
      para = [];
    }
  };
  while (i < lines.length) {
    const ln = lines[i];
    const b = ln.trim().match(/^\u0000B(\d+)\u0000$/);
    if (b) {
      flush();
      out.push(blocks[parseInt(b[1], 10)]);
      i++;
      continue;
    }
    if (!ln.trim()) {
      flush();
      i++;
      continue;
    }
    const h = ln.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flush();
      const sz = { 1: 17, 2: 16, 3: 15, 4: 14 }[h[1].length as 1 | 2 | 3 | 4];
      out.push(
        '<div style="font-weight:700;color:#1a3c6e;font-size:' +
          sz +
          'px;margin:12px 0 5px">' +
          inline(esc(h[2])) +
          "</div>",
      );
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(ln)) {
      flush();
      const it: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        it.push('<li style="margin:2px 0">' + inline(esc(lines[i].replace(/^\s*[-*]\s+/, ""))) + "</li>");
        i++;
      }
      out.push('<ul style="margin:5px 0 9px 20px;padding:0">' + it.join("") + "</ul>");
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(ln)) {
      flush();
      const it: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        it.push('<li style="margin:2px 0">' + inline(esc(lines[i].replace(/^\s*\d+[.)]\s+/, ""))) + "</li>");
        i++;
      }
      out.push('<ol style="margin:5px 0 9px 20px;padding:0">' + it.join("") + "</ol>");
      continue;
    }
    para.push(ln);
    i++;
  }
  flush();
  return DOMPurify.sanitize(out.join(""));
}
