import { existsSync } from "node:fs";
import puppeteer, { type Browser } from "puppeteer-core";
import { renderHtml } from "./html";
import type { Bast } from "./schema";

const LOCAL_CHROME = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean) as string[];

async function launch(): Promise<Browser> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });
  }
  const executablePath = LOCAL_CHROME.find((p) => existsSync(p));
  if (!executablePath) throw new Error("Chrome not found; set CHROME_PATH");
  return puppeteer.launch({ executablePath, headless: true });
}

export async function renderPdf(b: Bast): Promise<Uint8Array> {
  const html = await renderHtml(b);
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluateHandle("document.fonts.ready");
    return await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
  } finally {
    await browser.close();
  }
}
