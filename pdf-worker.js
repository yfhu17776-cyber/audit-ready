let ready=false;
try{importScripts('./pdf.min.js');ready=!!self.pdfjsLib}catch(error){self.__pdfLoadError=String(error&&error.message||error)}
async function extract(buffer){
 if(!ready)throw Error(self.__pdfLoadError||'PDF.js failed to load');
 const doc=await self.pdfjsLib.getDocument({data:buffer,disableWorker:true,useWasm:false}).promise;
 const parts=[];
 try{
  for(let i=1;i<=doc.numPages;i++){
   const page=await doc.getPage(i),tc=await page.getTextContent();
   const txt=tc.items.map(x=>x.str||'').join(' ').replace(/\s+/g,' ').trim();
   parts.push(i===1?txt:'\n[Page '+i+'] '+txt);page.cleanup();
  }
  return parts.join(' ').replace(/\s+/g,' ').trim();
 }finally{try{await doc.destroy()}catch{}}
}
self.onmessage=async ev=>{
 const {id,buffer}=ev.data||{};
 try{self.postMessage({id,ok:true,text:await extract(buffer)})}
 catch(error){self.postMessage({id,ok:false,error:String(error&&error.message||error)})}
};