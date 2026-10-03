let ready=false;
try{importScripts('./pdf.min.js')}catch(error){try{importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')}catch(e){self.__pdfLoadError=String(e&&e.message||e)}}
ready=!!self.pdfjsLib;
function extract(buffer){
  if(!ready)return Promise.reject(Error(self.__pdfLoadError||'PDF.js failed to load'));
  return self.pdfjsLib.getDocument({data:buffer,disableWorker:true,useWasm:false}).promise.then(function(doc){
    var chain=Promise.resolve(),parts=[];
    for(let i=1;i<=doc.numPages;i++){
      chain=chain.then(function(){
        return doc.getPage(i).then(function(page){
          return page.getTextContent().then(function(tc){
            var txt=tc.items.map(function(x){return x.str||''}).join(' ').replace(/\s+/g,' ').trim();
            parts.push(i===1?txt:'\n[Page '+i+'] '+txt);
            page.cleanup();
          });
        });
      });
    }
    return chain.then(function(){
      try{doc.destroy()}catch(e){}
      return parts.join(' ').replace(/\s+/g,' ').trim();
    },function(err){
      try{doc.destroy()}catch(e){}
      throw err;
    });
  });
}
self.onmessage=function(ev){
  var data=ev.data||{},id=data.id;
  extract(data.buffer).then(function(text){self.postMessage({id:id,ok:true,text:text})},function(error){self.postMessage({id:id,ok:false,error:String(error&&error.message||error)})});
};