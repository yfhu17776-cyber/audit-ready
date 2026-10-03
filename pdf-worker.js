let pdfLibPromise=null;
async function loadPdfLib(){
  if(!pdfLibPromise) pdfLibPromise=import('./pdf.min.mjs').catch(()=>import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs'));
  return pdfLibPromise;
}
async function extract(buffer){
  const lib=await loadPdfLib();
  const doc=await lib.getDocument({data:buffer,disableWorker:true,useWasm:false}).promise;
  const parts=[];
  try{
    for(let i=1;i<=doc.numPages;i++){
      const page=await doc.getPage(i);
      const tc=await page.getTextContent({disableCombineTextItems:false});
      const txt=tc.items.map(x=>x.str||'').join(' ').replace(/\s+/g,' ').trim();
      parts.push(i===1?txt:'\n[Page '+i+'] '+txt);
      page.cleanup();
    }
    return parts.join(' ').replace(/\s+/g,' ').trim();
  }finally{try{await doc.destroy()}catch{}}
}
self.onmessage=async ev=>{
  const {id,buffer}=ev.data||{};
  try{self.postMessage({id,ok:true,text:await extract(buffer)})}
  catch(error){self.postMessage({id,ok:false,error:String(error&&error.message||error)})}
};