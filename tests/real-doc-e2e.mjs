import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const site = "https://yfhu17776-cyber.github.io/audit-ready/";
const publicSmokeUrls = [
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
  "https://publicdocs.santa-ana.org/WebLink/DocView.aspx?dbid=1&id=547333&repo=Clerk"
];

const outDir = path.resolve("test-artifacts");
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const publicSmoke = [];
const generatedPdfs = [];

try {
  await page.goto(site, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("#auditStart").waitFor({ state: "visible", timeout: 30000 });

  for (let i = 0; i < publicSmokeUrls.length; i++) {
    const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    try {
      await p.goto(publicSmokeUrls[i], { waitUntil: "domcontentloaded", timeout: 45000 });
      await p.waitForTimeout(700);
      const text = await p.locator("body").innerText({ timeout: 10000 });
      const ok = /certificate of (liability )?insurance|workers.? compensation|workers.?compensation|insurance/i.test(text);
      publicSmoke.push(ok);
      console.log(`[PUBLIC ${i + 1}/${publicSmokeUrls.length}] ${ok ? "insurance-like" : "not-detected"}`);
    } catch {
      publicSmoke.push(false);
      console.log(`[PUBLIC ${i + 1}/${publicSmokeUrls.length}] failed`);
    } finally {
      await p.close();
    }
  }

  // Privacy-safe regression corpus: synthetic documents only. No third-party
  // insurance record is saved, uploaded as an artifact, or passed to AuditReady.
  const vendors = Array.from({ length: 25 }, (_, i) => `Test Contractor ${String(i + 1).padStart(2, "0")} LLC`);
  const gapVendors = vendors.slice(20);
  for (let i = 0; i < vendors.length; i++) {
    const vendor = vendors[i];
    const records = gapVendors.includes(vendor)
      ? [
          ["01/01/2024", "12/31/2025", `WC24-${i + 1}`],
          ["06/01/2026", "12/31/2026", `WC26-${i + 1}`]
        ]
      : [
          ["01/01/2024", "12/31/2025", `WC24-${i + 1}`],
          ["01/01/2026", "12/31/2026", `WC26-${i + 1}`]
        ];

    for (let j = 0; j < 2; j++) {
      const r = records[j];
      const doc = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await doc.setContent(`<!doctype html><html><body style="font-family:Arial;padding:42px">
        <h1>Certificate of Workers Compensation Insurance</h1>
        <p><b>Named Insured:</b> ${vendor}</p>
        <p><b>Policy Number:</b> ${r[2]}</p>
        <p><b>Workers Compensation:</b> Statutory Workers Compensation</p>
        <p><b>Effective Date:</b> ${r[0]}</p>
        <p><b>Expiration Date:</b> ${r[1]}</p>
        <p>Evidence type: Workers Compensation insurance record.</p>
      </body></html>`, { waitUntil: "domcontentloaded" });
      const file = path.join(outDir, `fixture-${i + 1}-${j + 1}.pdf`);
      await doc.pdf({ path: file, format: "Letter", printBackground: true });
      generatedPdfs.push(file);
      await doc.close();
    }
  }

  const rows = ["subcontractor,amount paid,payment date"];
  for (let i = 0; i < 50; i++) {
    const vendor = i < 45 ? vendors[i % 25] : `Missing Vendor ${i - 44} LLC`;
    rows.push(`${vendor},${2500 + i * 25},02/15/2026`);
  }
  // One payment per gap vendor is moved into the uncovered interval.
  for (let i = 0; i < 5; i++) rows[21 + i] = `${gapVendors[i]},${3000 + i * 25},03/15/2026`;

  const payFile = path.join(outDir, "synthetic-payments.csv");
  await fs.writeFile(payFile, rows.join("\n"));

  await page.locator("#auditStart").fill("01/01/2024");
  await page.locator("#auditEnd").fill("12/31/2026");
  await page.locator("#payfile").setInputFiles(payFile);
  await page.locator("#evfile").setInputFiles(generatedPdfs);

  await page.waitForFunction(
    () => /Loaded 50 evidence records from 50 file/.test(document.querySelector("#evinfo")?.textContent || ""),
    null,
    { timeout: 180000 }
  );

  await page.locator("#run").click();
  await page.locator("#results").waitFor({ state: "visible", timeout: 90000 });

  const summary = Number(await page.locator("#sumPayments").innerText());
  const attention = Number(await page.locator("#sumAttention").innerText());
  const matched = Number(await page.locator("#sumMatched").innerText());
  const low = Number(await page.locator("#sumLow").innerText());
  const timeline = await page.locator("#timeline").innerText();
  const headline = await page.locator("#headline").innerText();

  if (summary !== 50) throw new Error(`Expected 50 payments, got ${summary}`);
  if (attention !== 15) throw new Error(`Expected 15 attention cases, got ${attention}`);
  if (matched !== 35) throw new Error(`Expected 35 matched cases, got ${matched}`);
  if (low !== 0) throw new Error(`Expected 0 low-confidence cases, got ${low}`);
  if (!timeline.trim()) throw new Error("Vendor evidence timeline was empty");
  if (!headline.trim()) throw new Error("Result headline was empty");

  const summaryText = [
    `public_smoke_checked=${publicSmoke.length}`,
    `public_smoke_insurance_like=${publicSmoke.filter(Boolean).length}`,
    `synthetic_evidence_files=${generatedPdfs.length}`,
    `synthetic_evidence_records=50`,
    `payments_checked=${summary}`,
    `attention=${attention}`,
    `matched=${matched}`,
    `low_confidence=${low}`,
    `timeline_chars=${timeline.length}`,
    `headline=${headline}`
  ].join("\n");
  await fs.writeFile(path.join(outDir, "regression-summary.txt"), summaryText);
  await page.screenshot({ path: path.join(outDir, "regression-result.png"), fullPage: true });
  console.log(summaryText);
} finally {
  await browser.close();
}
