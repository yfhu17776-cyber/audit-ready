import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const site = "https://yfhu17776-cyber.github.io/audit-ready/";
const docUrls = [
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=557114&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=124138&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=124951&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=120765&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=558499&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=557282&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=140597&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=142881&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=223924&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=100590&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=105945&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=501240&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=96969&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=111867&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=226622&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=91137&page=1",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=141377&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=558547&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=134020&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=547333&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=558551&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=549330&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=545420&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=550120&repo=Clerk",
  "https://records.huntingtonbeachca.gov/WebLink/DocView.aspx?dbid=0&id=6829141&repo=COHB",
  "https://records.huntingtonbeachca.gov/WebLink/DocView.aspx?dbid=0&id=6755890&repo=COHB",
  "https://cc-publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=134104&repo=Clerk",
  "https://cc-publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=501490&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=84421&repo=Clerk",
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=547061&repo=Clerk"
];

const outDir = path.resolve("test-artifacts");
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const failures = [];
const pdfs = [];

try {
  await page.goto(site, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("#auditStart").waitFor({ state: "visible", timeout: 30000 });

  for (let i = 0; i < docUrls.length; i++) {
    const url = docUrls[i];
    const docPage = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    try {
      await docPage.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await docPage.waitForTimeout(1000);
      const bodyText = await docPage.locator("body").innerText({ timeout: 10000 });
      if (!/certificate of (liability )?insurance|workers.? compensation|workers.?compensation|insurance/i.test(bodyText)) {
        throw new Error("Page did not expose recognizable insurance text");
      }
      const file = path.join(outDir, `real-insurance-${String(i + 1).padStart(2, "0")}.pdf`);
      await docPage.pdf({ path: file, format: "Letter", printBackground: true });
      pdfs.push(file);
      console.log(`[DOC ${i + 1}/${docUrls.length}] ${bodyText.length} chars`);
    } catch (e) {
      failures.push({ url, error: String(e) });
      console.log(`[DOC ${i + 1}/${docUrls.length}] FAILED: ${e}`);
    } finally {
      await docPage.close();
    }
  }

  if (pdfs.length < 20) throw new Error(`Only ${pdfs.length} public insurance-bearing documents captured`);

  const paymentCsv = [
    "subcontractor,amount paid,payment date",
    "eSentire America, Inc.,12500,2026-06-15",
    "Igoe & Company, Incorporated DBA Igoe Administrative Services, Incorporated,8400,2026-02-20",
    "Civic Calling Corporation,4200,2026-05-05",
    "CSG Consultants, Inc.,6300,2026-06-10",
    "Odyssey Power Corporation,9800,2024-10-12",
    "KOA Corporation,5100,2024-10-15",
    "Mark Thomas & Company, Inc.,7200,2024-10-20",
    "Working Wardrobes for A New Start,9100,2024-09-20",
    "MVR Consulting,6400,2025-05-10",
    "Global Power Group, Inc.,8800,2026-08-15",
    "G2 Advisory Group, LLC,4500,2026-02-15",
    "Santolucito Dore Group, Inc.,5200,2025-10-10",
    "eSentire America, Inc.,3100,2025-09-20",
    "Civic Calling Corporation,2700,2026-08-20"
  ].join("\n");
  const payFile = path.join(outDir, "stress-payments.csv");
  await fs.writeFile(payFile, paymentCsv);

  await page.bringToFront();
  await page.locator("#auditStart").fill("2024-01-01");
  await page.locator("#auditEnd").fill("2026-12-31");
  await page.locator("#payfile").setInputFiles(payFile);
  await page.locator("#evfile").setInputFiles(pdfs);

  await page.waitForFunction(() => /Loaded \d+ evidence records from \d+ file/.test(document.querySelector("#evinfo")?.textContent || ""), null, { timeout: 180000 });
  const evInfo = await page.locator("#evinfo").innerText();
  console.log("Evidence ingestion:", evInfo);

  await page.locator("#run").click();
  await page.locator("#results").waitFor({ state: "visible", timeout: 60000 });

  const summary = await page.locator("#sumPayments").innerText();
  const attention = await page.locator("#attentionCount").innerText();
  const timeline = await page.locator("#timeline").innerText();
  const headline = await page.locator("#headline").innerText();

  if (Number(summary) !== 14) throw new Error(`Expected 14 payments, got ${summary}`);
  if (!timeline.trim()) throw new Error("Vendor evidence timeline was empty");
  if (!headline.trim()) throw new Error("Result headline was empty");

  await page.screenshot({ path: path.join(outDir, "stress-result.png"), fullPage: true });
  await fs.writeFile(path.join(outDir, "stress-result.txt"), [
    `documents_captured=${pdfs.length}`,
    `capture_failures=${failures.length}`,
    `evidence_info=${evInfo}`,
    `payments_checked=${summary}`,
    `attention=${attention}`,
    `timeline_chars=${timeline.length}`,
    `headline=${headline}`
  ].join("\n"));

  if (failures.length) await fs.writeFile(path.join(outDir, "capture-failures.json"), JSON.stringify(failures, null, 2));
} finally {
  await browser.close();
}
