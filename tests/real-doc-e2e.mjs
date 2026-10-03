import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
const site='http://127.0.0.1:4173/index.html';
const dir=path.resolve('test-artifacts');
await fs.rm(dir,{recursive:true,force:true});
await fs.mkdir(dir,{recursive:true});
const server=spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'ignore'});
await new Promise(r=>setTimeout(r,1500));
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const pageErrors=[]; page.on('pageerror',e=>pageErrors.push('pageerror:'+String(e))); page.on('console',m=>{if(m.type()==='error')pageErrors.push('console:'+m.text()+' @'+m.location().url+':'+m.location().lineNumber)});
try {
 await page.goto(site,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#auditStart').waitFor({state:'visible',timeout:30000});
 const vendors=Array.from({length:15},(_,i)=>'Test Contractor '+String(i+1).padStart(2,'0')+' LLC');
 const files=[];
 for(let i=0;i<15;i++){
  const doc=await browser.newPage({viewport:{width:1280,height:900}});
  await doc.setContent('<html><body style="font-family:Arial;padding:42px"><h1>Certificate of Workers Compensation Insurance</h1><p><b>Named Insured:</b> '+vendors[i]+'</p><p><b>Policy Number:</b> WC24-'+(i+1)+'</p><p><b>Workers Compensation:</b> Statutory Workers Compensation</p><p><b>Effective Date:</b> 01/01/2024</p><p><b>Expiration Date:</b> 12/31/2025</p></body></html>');
  const f1=path.join(dir,'fixture-'+(i+1)+'-1.pdf'); await doc.pdf({path:f1,format:'Letter'}); files.push(f1); await doc.close();
  const doc2=await browser.newPage({viewport:{width:1280,height:900}});
  await doc2.setContent('<html><body style="font-family:Arial;padding:42px"><h1>Certificate of Workers Compensation Insurance</h1><p><b>Named Insured:</b> '+vendors[i]+'</p><p><b>Policy Number:</b> WC26-'+(i+1)+'</p><p><b>Workers Compensation:</b> Statutory Workers Compensation</p><p><b>Effective Date:</b> 01/01/2026</p><p><b>Expiration Date:</b> 12/31/2026</p></body></html>');
  const f2=path.join(dir,'fixture-'+(i+1)+'-2.pdf'); await doc2.pdf({path:f2,format:'Letter'}); files.push(f2); await doc2.close();
 }
 const rows=['subcontractor,amount paid,payment date'];
 for(let i=0;i<30;i++) rows.push(vendors[i%15]+','+(2500+i*25)+',02/15/2026');
 const pay=path.join(dir,'synthetic-payments.csv'); await fs.writeFile(pay,rows.join('\n'));
 await page.locator('#auditStart').fill('2024-01-01'); await page.locator('#auditEnd').fill('2026-12-31');
 await page.locator('#payfile').setInputFiles(pay); await page.locator('#evfile').setInputFiles(files);
 await page.waitForTimeout(3000);
 const early=await page.locator('#evinfo').innerText();
 if(!/Processed|Loaded/.test(early)) throw new Error('Evidence pipeline did not start: '+early+' | '+pageErrors.join(' || '));
 await page.waitForFunction(()=>/Processed 1 \/ 30|Processed 2 \/ 30|Processed 3 \/ 30|Loaded/.test(document.querySelector('#evinfo')?.textContent||''),null,{timeout:30000}).catch(async e=>{throw new Error('Evidence pipeline stalled after 30s: '+(await page.locator('#evinfo').innerText())+' | '+pageErrors.join(' || '));});
 await page.waitForFunction(()=>/Loaded 30 evidence records from 30 file/.test(document.querySelector('#evinfo')?.textContent||''),null,{timeout:30000});
 await page.locator('#run').click(); await page.locator('#results').waitFor({state:'visible',timeout:90000});
 const summary=Number(await page.locator('#sumPayments').innerText()); const attention=Number(await page.locator('#sumAttention').innerText()); const matched=Number(await page.locator('#sumMatched').innerText()); const low=Number(await page.locator('#sumLow').innerText());
 if(summary!==30) throw new Error('Expected 30 payments, got '+summary); if(attention!==0) throw new Error('Expected 0 attention cases, got '+attention); if(matched!==30) throw new Error('Expected 30 matched cases, got '+matched); if(low!==0) throw new Error('Expected 0 low-confidence cases, got '+low);
 if(!(await page.locator('#timeline').innerText()).trim()) throw new Error('Timeline empty'); if(!(await page.locator('#headline').innerText()).trim()) throw new Error('Headline empty');
 await fs.writeFile(path.join(dir,'regression-summary.txt'),'privacy_safe=true\nevidence_files='+files.length+'\npayments='+summary+'\nattention='+attention+'\nmatched='+matched+'\nlow_confidence='+low); await page.screenshot({path:path.join(dir,'regression-result.png'),fullPage:true});
 } finally { await browser.close(); server.kill('SIGTERM'); }
