import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
const site='https://yfhu17776-cyber.github.io/audit-ready/';
const dir=path.resolve('test-artifacts');
await fs.rm(dir,{recursive:true,force:true});
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
try {
 await page.goto(site,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#auditStart').waitFor({state:'visible',timeout:30000});
 const vendors=Array.from({length:25},(_,i)=>'Test Contractor '+String(i+1).padStart(2,'0')+' LLC');
 const gaps=vendors.slice(20);
 const files=[];
 for(let i=0;i<25;i++){
  const doc=await browser.newPage({viewport:{width:1280,height:900}});
  const end1=gaps.includes(vendors[i])?'12/31/2025':'12/31/2025';
  const start2=gaps.includes(vendors[i])?'06/01/2026':'01/01/2026';
  await doc.setContent('<html><body style="font-family:Arial;padding:42px"><h1>Certificate of Workers Compensation Insurance</h1><p><b>Named Insured:</b> '+vendors[i]+'</p><p><b>Policy Number:</b> WC24-'+(i+1)+'</p><p><b>Workers Compensation:</b> Statutory Workers Compensation</p><p><b>Effective Date:</b> 01/01/2024</p><p><b>Expiration Date:</b> '+end1+'</p></body></html>');
  const f=path.join(dir,'fixture-'+(i+1)+'-1.pdf'); await doc.pdf({path:f,format:'Letter'}); files.push(f); await doc.close();
  const doc2=await browser.newPage({viewport:{width:1280,height:900}});
  await doc2.setContent('<html><body style="font-family:Arial;padding:42px"><h1>Certificate of Workers Compensation Insurance</h1><p><b>Named Insured:</b> '+vendors[i]+'</p><p><b>Policy Number:</b> WC26-'+(i+1)+'</p><p><b>Workers Compensation:</b> Statutory Workers Compensation</p><p><b>Effective Date:</b> '+start2+'</p><p><b>Expiration Date:</b> 12/31/2026</p></body></html>');
  const f2=path.join(dir,'fixture-'+(i+1)+'-2.pdf'); await doc2.pdf({path:f2,format:'Letter'}); files.push(f2); await doc2.close();
 }
 const rows=['subcontractor,amount paid,payment date'];
 for(let i=0;i<50;i++){let v=i<45?vendors[i%25]:'Missing Vendor '+(i-44)+' LLC'; rows.push(v+','+(2500+i*25)+',02/15/2026');}
 for(let i=0;i<5;i++) rows[21+i]=gaps[i]+','+(3000+i*25)+',03/15/2026';
 const pay=path.join(dir,'synthetic-payments.csv'); await fs.writeFile(pay,rows.join('\n'));
 await page.locator('#auditStart').fill('2024-01-01'); await page.locator('#auditEnd').fill('2026-12-31');
 await page.locator('#payfile').setInputFiles(pay); await page.locator('#evfile').setInputFiles(files);
 await page.waitForFunction(()=>/Processed 50 \/ 50 evidence files/.test(document.querySelector('#evinfo')?.textContent||''),null,{timeout:180000}); await page.waitForFunction(()=>/Loaded 50 evidence records from 50 file/.test(document.querySelector('#evinfo')?.textContent||''),null,{timeout:30000});
 await page.locator('#run').click(); await page.locator('#results').waitFor({state:'visible',timeout:90000});
 const summary=Number(await page.locator('#sumPayments').innerText()); const attention=Number(await page.locator('#sumAttention').innerText()); const matched=Number(await page.locator('#sumMatched').innerText()); const low=Number(await page.locator('#sumLow').innerText());
 if(summary!==50) throw new Error('Expected 50 payments, got '+summary); if(attention!==10) throw new Error('Expected 10 attention cases, got '+attention); if(matched!==40) throw new Error('Expected 40 matched cases, got '+matched); if(low!==0) throw new Error('Expected 0 low-confidence cases, got '+low);
 if(!(await page.locator('#timeline').innerText()).trim()) throw new Error('Timeline empty'); if(!(await page.locator('#headline').innerText()).trim()) throw new Error('Headline empty');
 await fs.writeFile(path.join(dir,'regression-summary.txt'),'privacy_safe=true\nevidence_files='+files.length+'\npayments='+summary+'\nattention='+attention+'\nmatched='+matched+'\nlow_confidence='+low); await page.screenshot({path:path.join(dir,'regression-result.png'),fullPage:true});
} finally { await browser.close(); }
