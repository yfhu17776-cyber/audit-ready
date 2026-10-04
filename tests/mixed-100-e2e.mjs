import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import XLSX from 'xlsx';

const site='http://127.0.0.1:4173/index.html';
const dir=path.resolve('test-artifacts/mixed-100');
await fs.rm(dir,{recursive:true,force:true});
await fs.mkdir(dir,{recursive:true});

const server=spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'ignore'});
await new Promise(r=>setTimeout(r,1200));

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];
page.on('pageerror',e=>errors.push('pageerror:'+String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push('console:'+m.text())});

const vendors=Array.from({length:100},(_,i)=>'Mixed Test Contractor '+String(i+1).padStart(3,'0')+' LLC');
const files=[];
const manifest=[];
try {
  await page.goto(site,{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#auditStart').waitFor({state:'visible',timeout:30000});
  await page.waitForFunction(()=>!!window.pdfjsLib,{timeout:30000});
  const pdfEngine=await page.evaluate(()=>({ok:!!window.pdfjsLib,version:window.pdfjsLib?.version||'local-shim'}));
  if(!pdfEngine.ok) throw new Error('PDF engine unavailable');

  const generator=await browser.newPage({viewport:{width:1200,height:900}});
  for(let i=0;i<100;i++){
    const vendor=vendors[i], policy='WC-MIX-'+String(i+1).padStart(4,'0'), amount=3000+i*37;
    const kind=i<20?'csv':i<40?'xlsx':i<60?'pdf':i<80?'png':'jpg';
    const ext=kind==='xlsx'?'xlsx':kind;
    const file=path.join(dir,kind+'-'+String(i+1).padStart(3,'0')+'.'+ext);
    const effective='2026-01-01', expiration='2026-12-31';
    if(kind==='csv'){
      await fs.writeFile(file,'subcontractor,policy type,evidence type,effective date,expiration date,policy number,source\n'+
        [vendor,'Workers Comp','Certificate',effective,expiration,policy,'CSV evidence '+(i+1)].join(',')+'\n');
    } else if(kind==='xlsx'){
      const wb=XLSX.utils.book_new();
      const ws=XLSX.utils.json_to_sheet([{subcontractor:vendor,'policy type':'Workers Comp','evidence type':'Certificate','effective date':effective,'expiration date':expiration,'policy number':policy,source:'Excel evidence '+(i+1)}]);
      XLSX.utils.book_append_sheet(wb,ws,'Evidence');
      XLSX.writeFile(wb,file);
    } else {
      const label=kind==='pdf'
        ? '<h1>Certificate of Workers Compensation Insurance</h1>'
        : '<h1>Workers Compensation Certificate</h1>';
      await generator.setContent('<html><body style="font-family:Arial,sans-serif;padding:55px"><h2>'+label+'</h2>'+
        '<p><b>Named Insured:</b> '+vendor+'</p>'+
        '<p><b>Policy Number:</b> '+policy+'</p>'+
        '<p><b>Workers Compensation:</b> Statutory Workers Compensation</p>'+
        '<p><b>Effective Date:</b> 01/01/2026</p>'+
        '<p><b>Expiration Date:</b> 12/31/2026</p></body></html>');
      if(kind==='pdf') await generator.pdf({path:file,format:'Letter'});
      else await generator.screenshot({path:file,fullPage:true,type:(kind==='jpg'?'jpeg':'png')});
    }
    files.push(file);
    manifest.push({index:i+1,vendor,kind,expected:'Matched',amount});
  }
  await generator.close();

  const pay=path.join(dir,'payments-100.csv');
  const rows=['subcontractor,amount paid,payment date'];
  for(const m of manifest) rows.push([m.vendor,m.amount,'2026-06-15'].join(','));
  await fs.writeFile(pay,rows.join('\n'));

  await page.locator('#auditStart').fill('2026-01-01');
  await page.locator('#auditEnd').fill('2026-12-31');
  await page.locator('#payfile').setInputFiles(pay);
  await page.locator('#evfile').setInputFiles(files);

  await page.waitForFunction(()=>/Loaded 100 evidence records from 100 file/.test(document.querySelector('#evinfo')?.textContent||''),null,{timeout:240000});
  if(errors.length) throw new Error('Errors during import: '+errors.join(' || '));

  await page.locator('#run').click();
  await page.locator('#results').waitFor({state:'visible',timeout:30000});
  const summary=await page.evaluate(()=>({
    payments:Number(document.querySelector('#sumPayments')?.textContent||0),
    attention:Number(document.querySelector('#sumAttention')?.textContent||0),
    matched:Number(document.querySelector('#sumMatched')?.textContent||0),
    low:Number(document.querySelector('#sumLow')?.textContent||0),
    affected:document.querySelector('#affectedTotal')?.textContent||'',
    headline:document.querySelector('#headline')?.textContent||''
  }));
  if(summary.payments!==100||summary.attention!==0||summary.matched!==100||summary.low!==0){
    throw new Error('100-case aggregate mismatch: '+JSON.stringify(summary)+' errors='+errors.join(' || '));
  }

  const details=await page.evaluate(()=>Array.from(document.querySelectorAll('#okay > div')).map(x=>x.textContent||''));
  for(const m of manifest){
    const hit=details.some(t=>t.includes(m.vendor)&&t.includes('Matched'));
    if(!hit) throw new Error('Case '+m.index+' failed individual match: '+m.kind+' '+m.vendor);
  }

  const byKind={};
  for(const m of manifest) byKind[m.kind]=(byKind[m.kind]||0)+1;
  const report=[
    'mixed_test_count=100',
    'input_distribution='+JSON.stringify(byKind),
    'payments=100',
    'matched=100',
    'attention=0',
    'low_confidence=0',
    'match_accuracy=100%',
    'status=passed',
    'pdf_engine='+pdfEngine.version
  ].join('\n')+'\n';
  await fs.writeFile(path.join(dir,'mixed-100-report.txt'),report);
  await fs.writeFile(path.join(dir,'mixed-100-manifest.json'),JSON.stringify(manifest,null,2));
  await page.screenshot({path:path.join(dir,'mixed-100-result.png'),fullPage:true});
  console.log(report);
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
