import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const site='http://127.0.0.1:4175/index.html';
const dir=path.resolve('test-artifacts/inferred-date');
await fs.rm(dir,{recursive:true,force:true});
await fs.mkdir(dir,{recursive:true});
const server=spawn('python3',['-m','http.server','4175','--bind','127.0.0.1'],{stdio:'ignore'});
await new Promise(r=>setTimeout(r,1200));

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];
page.on('pageerror',e=>errors.push('pageerror:'+String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push('console:'+m.text())});

try {
  await page.goto(site,{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#auditStart').waitFor({state:'visible',timeout:30000});

  const pdfPage=await browser.newPage({viewport:{width:1280,height:900}});
  await pdfPage.setContent('<html><body style="font-family:Arial;padding:48px"><h1>Certificate of Workers Compensation Insurance</h1><p><b>Named Insured:</b> Inferred Date Contractor LLC</p><p><b>Policy Number:</b> WC-INFER-001</p><p>Workers Compensation insurance is provided for the policy period.</p><p>01/01/2026 through 12/31/2026</p></body></html>');
  const pdf=path.join(dir,'inferred-date-evidence.pdf');
  await pdfPage.pdf({path:pdf,format:'Letter'});
  await pdfPage.close();

  const pay=path.join(dir,'payments.csv');
  await fs.writeFile(pay,'subcontractor,amount paid,payment date\nInferred Date Contractor LLC,7500,2026-06-15\n');

  await page.locator('#auditStart').fill('2026-01-01');
  await page.locator('#auditEnd').fill('2026-12-31');
  await page.locator('#payfile').setInputFiles(pay);
  await page.locator('#evfile').setInputFiles(pdf);
  await page.waitForFunction(()=>/Loaded 1 evidence records from 1 file/.test(document.querySelector('#evinfo')?.textContent||''),null,{timeout:60000});
  if(errors.length) throw new Error('Import errors: '+errors.join(' || '));

  await page.locator('#run').click();
  await page.locator('#results').waitFor({state:'visible',timeout:15000});
  const state=await page.evaluate(()=>({
    attention:document.querySelector('#sumAttention')?.textContent||'',
    matched:document.querySelector('#sumMatched')?.textContent||'',
    low:document.querySelector('#sumLow')?.textContent||'',
    attentionText:document.querySelector('#attention')?.textContent||''
  }));
  if(errors.length) throw new Error('Run errors: '+errors.join(' || '));
  if(Number(state.attention)!==1) throw new Error('Expected one MANUAL REVIEW item, got '+state.attention);
  if(Number(state.matched)!==0) throw new Error('Inferred-date evidence must not be VERIFIED.');
  if(Number(state.low)!==1) throw new Error('Inferred-date evidence must remain low-confidence/review.');
  if(!/MANUAL REVIEW/i.test(state.attentionText) || !/Ambiguous evidence dates/i.test(state.attentionText)) {
    throw new Error('Expected explicit manual-review reason for inferred evidence dates: '+state.attentionText);
  }

  await fs.writeFile(path.join(dir,'inferred-date-report.txt'),[
    'case=inferred-date-evidence',
    'payment=7500',
    'expected=MANUAL REVIEW',
    'verified=0',
    'manual_review=1',
    'status=passed'
  ].join('\n')+'\n');
  console.log('inferred-date regression passed');
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
