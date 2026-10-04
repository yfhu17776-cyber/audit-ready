import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import XLSX from 'xlsx';

const site='http://127.0.0.1:4174/index.html';
const dir=path.resolve('test-artifacts/adversarial-100');
await fs.rm(dir,{recursive:true,force:true});
await fs.mkdir(dir,{recursive:true});
const server=spawn('python3',['-m','http.server','4174','--bind','127.0.0.1'],{stdio:'ignore'});
await new Promise(r=>setTimeout(r,1200));
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];
page.on('pageerror',e=>errors.push('pageerror:'+e));
page.on('console',m=>{if(m.type()==='error')errors.push('console:'+m.text())});

const cases=[];
const kinds=['csv','xlsx','pdf','png','jpg'];
const statuses=['Matched','Evidence missing','Wrong evidence type','Coverage gap','Outside audit period'];
for(let i=1;i<=100;i++){
  const kind=kinds[Math.floor((i-1)/20)], bucket=(i-1)%20;
  let expected='Matched', vendor='Adversarial Contractor '+String(i).padStart(3,'0')+' LLC';
  if(bucket>=12 && bucket<15) expected='Evidence missing';
  else if(bucket>=15 && bucket<17) expected='Wrong evidence type';
  else if(bucket>=17 && bucket<19) expected='Coverage gap';
  else if(bucket===19) expected='Outside audit period';
  cases.push({id:i,kind,vendor,expected,amount:5000+i*13,paymentDate:bucket===19?'2025-12-31':'2026-06-15'});
}
try{
  await page.goto(site,{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#auditStart').waitFor({state:'visible',timeout:30000});
  const generator=await browser.newPage({viewport:{width:1200,height:900}});
  const files=[];
  for(const c of cases){
    const policy='WC-ADV-'+String(c.id).padStart(4,'0');
    const file=path.join(dir,c.kind+'-'+String(c.id).padStart(3,'0')+'.'+(c.kind==='xlsx'?'xlsx':c.kind));
    const evidenceVendor=c.expected==='Evidence missing'?'Completely Different Vendor '+c.id:c.vendor;
    const type=c.expected==='Wrong evidence type'?'General Liability':'Workers Comp';
    const start='2026-01-01', end=c.expected==='Coverage gap'?'2026-06-01':'2026-12-31';
    if(c.kind==='csv'){
      const rows=[['subcontractor','policy type','evidence type','effective date','expiration date','policy number','source'],[evidenceVendor,type,'Certificate',start,end,policy,'adversarial-'+c.id+'.csv']];
      await fs.writeFile(file,rows.map(r=>r.join(',')).join('\n'));
    } else if(c.kind==='xlsx'){
      const wb=XLSX.utils.book_new();
      const ws=XLSX.utils.json_to_sheet([{subcontractor:evidenceVendor,'policy type':type,'evidence type':'Certificate','effective date':start,'expiration date':end,'policy number':policy,source:'adversarial-'+c.id+'.xlsx'}]);
      XLSX.utils.book_append_sheet(wb,ws,'Evidence');
      XLSX.writeFile(wb,file);
    } else {
      let vendorText=evidenceVendor;
      if(c.expected==='Matched' && c.id%5===0) vendorText=evidenceVendor.replace('Contractor','CONTRACTOR').replace('LLC',' L.L.C.');
      const html='<html><body style="font-family:Arial,sans-serif;padding:55px"><h1>Certificate of Workers Compensation Insurance</h1><p><b>Named Insured:</b> '+vendorText+'</p><p><b>Policy Number:</b> '+policy+'</p><p><b>'+type+':</b> '+(type==='Workers Comp'?'Statutory Workers Compensation':'Commercial General Liability')+'</p><p><b>Effective Date:</b> '+(start==='2026-01-01'?'01/01/2026':start)+'</p><p><b>Expiration Date:</b> '+(end==='2026-12-31'?'12/31/2026':end)+'</p></body></html>';
      await generator.setContent(html);
      if(c.kind==='pdf') await generator.pdf({path:file,format:'Letter'});
      else await generator.screenshot({path:file,fullPage:true,type:c.kind==='jpg'?'jpeg':'png'});
    }
    files.push(file);
  }
  await generator.close();
  const pay=path.join(dir,'payments-100.csv');
  const rows=['subcontractor,amount paid,payment date'];
  for(const c of cases) rows.push([c.vendor,c.amount,c.paymentDate].join(','));
  await fs.writeFile(pay,rows.join('\n'));
  await page.locator('#auditStart').fill('2026-01-01');
  await page.locator('#auditEnd').fill('2026-12-31');
  await page.locator('#payfile').setInputFiles(pay);
  await page.locator('#evfile').setInputFiles(files);
  await page.waitForFunction(()=>/Loaded 100 evidence records from 100 file/.test(document.querySelector('#evinfo')?.textContent||''),null,{timeout:300000});
  if(errors.length) throw new Error('Import errors: '+errors.join(' || '));
  await page.locator('#run').click();
  await page.locator('#results').waitFor({state:'visible',timeout:30000});
  const actual=await page.evaluate(()=>Array.from(Array.from(document.querySelectorAll('#attention .actiongrid > div:not(.head)')).reduce((acc,_,i,arr)=>{if(i%4===0){acc.push({vendor:arr[i]?.textContent?.trim()||'',status:arr[i+2]?.textContent?.trim()||''})}return acc},[])));
  const matched=await page.evaluate(()=>Array.from(document.querySelectorAll('#okay > div')).map(x=>x.textContent||''));
  const failures=[];
  for(const c of cases){
    const hitMatched=matched.some(t=>t.includes(c.vendor));
    const hit=actual.find(x=>x.vendor.includes(c.vendor));
    const got=hitMatched?'Matched':hit?.status?.split('Evidence confidence')[0].trim()||'Not found';
    if(!(got==='Matched' ? c.expected==='Matched' : got.includes(c.expected))) failures.push({id:c.id,vendor:c.vendor,expected:c.expected,got});
  }
  const summary=await page.evaluate(()=>({payments:+document.querySelector('#sumPayments').textContent,attention:+document.querySelector('#sumAttention').textContent,matched:+document.querySelector('#sumMatched').textContent,low:+document.querySelector('#sumLow').textContent}));
  if(failures.length) throw new Error('Adversarial mismatches: '+JSON.stringify(failures));
  await fs.writeFile(path.join(dir,'adversarial-100-report.txt'),['adversarial_test_count=100','format_distribution='+JSON.stringify(kinds.reduce((o,k)=>{o[k]=20;return o},{})),'expected_status_distribution='+JSON.stringify(statuses.reduce((o,s)=>{o[s]=cases.filter(c=>c.expected===s).length;return o},{})),'payments='+summary.payments,'attention='+summary.attention,'matched='+summary.matched,'low_confidence='+summary.low,'case_accuracy=100%','false_positive=0','false_negative=0','status=passed'].join('\n')+'\n');
  await fs.writeFile(path.join(dir,'adversarial-100-manifest.json'),JSON.stringify(cases,null,2));
  await page.screenshot({path:path.join(dir,'adversarial-100-result.png'),fullPage:true});
  console.log('adversarial-100 passed');
} finally { await browser.close(); server.kill('SIGTERM'); }
