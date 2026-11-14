import { readFile } from "node:fs/promises";
import path from "node:path";
import { launch } from "./pdf";

/**
 * Approximate DOCX -> PDF: renders the DOCX with docx-preview inside headless
 * Chromium and prints it. Layout is close to Word but not identical.
 */

const NM = path.join(process.cwd(), "node_modules");
let assets: Promise<{ scripts: string[]; css: string }> | null = null;

function loadAssets() {
  assets ??= (async () => {
    const scripts = await Promise.all([
      readFile(path.join(NM, "jszip", "dist", "jszip.min.js"), "utf8"),
      readFile(path.join(NM, "docx-preview", "dist", "docx-preview.min.js"), "utf8"),
    ]);
    // Metric-compatible open fonts standing in for the Office fonts used by the templates.
    const map: [string[], string, string][] = [
      [["Arial", "Segoe UI", "Helvetica"], "arimo", "arimo"],
      [["Calibri", "Calibri Light", "Aptos"], "carlito", "carlito"],
      [["Times New Roman", "Times"], "tinos", "tinos"],
      [["Cambria"], "caladea", "caladea"],
    ];
    const faces: string[] = [];
    for (const [names, pkg, file] of map)
      for (const [weight, style] of [
        [400, "normal"],
        [700, "normal"],
        [400, "italic"],
        [700, "italic"],
      ] as const) {
        const f = path.join(NM, "@fontsource", pkg, "files", `${file}-latin-${weight}-${style}.woff2`);
        const b64 = (await readFile(f)).toString("base64");
        for (const name of names)
          faces.push(
            `@font-face{font-family:"${name}";font-weight:${weight};font-style:${style};src:url(data:font/woff2;base64,${b64}) format("woff2");}`,
          );
      }
    const css = `${faces.join("\n")}
html,body{margin:0;padding:0;background:#fff}
.docx-wrapper{background:#fff!important;padding:0!important;display:block!important}
.docx-wrapper>section.docx{box-shadow:none!important;margin:0 auto!important;break-after:page;overflow:hidden}
.docx-wrapper>section.docx:last-child{break-after:auto}`;
    return { scripts, css };
  })();
  return assets;
}

// Symbol/Wingdings private-use bullets that have no glyph in web fonts.
const GLYPHS: Record<string, string> = {
  "": "•",
  "": "▪",
  "": "❖",
  "": "➢",
  "": "✓",
  "": "☐",
  "": "☒",
  "": "□",
  "": "➔",
  "": "-",
};

export async function docxToPdf(docx: Buffer): Promise<Uint8Array> {
  return render(docx, "pdf") as Promise<Uint8Array>;
}

/** Full-page PNG of the rendered document (used by scripts/render-form.mts for visual checks). */
export async function docxToPng(docx: Buffer): Promise<Uint8Array> {
  return render(docx, "png") as Promise<Uint8Array>;
}

async function render(docx: Buffer, kind: "pdf" | "png"): Promise<Uint8Array> {
  const { scripts, css } = await loadAssets();
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div id="c"></div></body></html>`);
    for (const s of scripts) await page.addScriptTag({ content: s });
    const size = await page.evaluate(
      async (b64: string, glyphs: Record<string, string>) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const docx = (window as any).docx;
        await docx.renderAsync(bytes, document.getElementById("c"), null, {
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          renderHeaders: true,
          renderFooters: true,
          experimental: true,
        });
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const re = new RegExp(`[${Object.keys(glyphs).join("")}]`, "g");
        for (let n = walker.nextNode(); n; n = walker.nextNode())
          if (re.test(n.nodeValue ?? "")) n.nodeValue = (n.nodeValue ?? "").replace(re, (c) => glyphs[c] ?? c);
        const sec = document.querySelector<HTMLElement>(".docx-wrapper > section.docx");
        if (!sec) return null;
        const w = sec.offsetWidth;
        const h = parseFloat(sec.style.minHeight || "0") * (sec.style.minHeight.endsWith("pt") ? 96 / 72 : 1) || sec.offsetHeight;
        // Each section prints as exactly one page of the document's own size. Content wider than
        // the page (tables extending into the margins) is scaled down to fit instead of clipped.
        document.querySelectorAll<HTMLElement>(".docx-wrapper > section.docx").forEach((s) => {
          s.style.minHeight = `${h}px`;
          s.style.overflow = "visible";
          const pad = parseFloat(getComputedStyle(s).paddingRight) || 0;
          let right = 0;
          s.querySelectorAll<HTMLElement>("table, img, p").forEach((el) => {
            right = Math.max(right, el.getBoundingClientRect().right - s.getBoundingClientRect().left);
          });
          const need = right + Math.min(pad, 24);
          if (need > w + 1) {
            const ratio = w / need;
            s.style.width = `${need}px`;
            s.style.minHeight = `${h / ratio}px`;
            s.style.zoom = String(ratio);
          }
          s.style.overflow = "hidden";
        });
        const st = document.createElement("style");
        st.textContent = `@page{size:${w}px ${h}px;margin:0}`;
        document.head.appendChild(st);
        return { w, h };
      },
      docx.toString("base64"),
      GLYPHS,
    );
    await page.evaluateHandle("document.fonts.ready");
    if (kind === "png") {
      await page.setViewport({ width: Math.ceil(size?.w ?? 800), height: 800 });
      return await page.screenshot({ fullPage: true, type: "png" });
    }
    return await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      ...(size ? {} : { format: "A4" as const }),
    });
  } finally {
    await browser.close();
  }
}
