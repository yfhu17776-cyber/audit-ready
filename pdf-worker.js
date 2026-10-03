let pdfLibPromise = null;

async function loadPdfLib(){
  if(!pdfLibPromise) pdfLibPromise = import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
  return pdfLibPromise;
}

self.onmessage = async ev => {
  const {id, buffer} = ev.data || {};
  try{
    const lib = await loadPdfLib();
    const doc = await lib.getDocument({data:buffer, disableWorker:true}).promise;
    const parts = [];
    try{
      for(let i=1;i<=doc.numPages;i++){
        const page = await doc.getPage(i);
        const tc = await page.getTextContent();
        const txt = tc.items.map(x=>x.str).join(' ').replace(/\s+/g,' ').trim();
        parts.push(i === 1 ? txt : '\n[Page '+i+'] '+txt);
        page.cleanup();
      }
      self.postMessage({id, ok:true, text:parts.join(' ')});
    }finally{
      try{await doc.destroy()}catch{}
    }
  }catch(error){
    self.postMessage({id, ok:false, error:String(error && error.message || error)});
  }
};
