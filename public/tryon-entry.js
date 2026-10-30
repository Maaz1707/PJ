// Keep computer vision and 3D libraries off the storefront's initial load.
(()=>{
 let loading=false,pendingFinish=null;
 function inject(){
  let id;try{id=decodeURIComponent(location.hash.replace(/^#product\//,''))}catch{return}
  const p=CATALOG.find(p=>p.id===id);
  const purchase=document.querySelector('.detail-content .purchase');
  if(!purchase||p?.category!=='Rings')return;
  if(pendingFinish){document.querySelector(`[data-metal="${pendingFinish}"]`)?.click();pendingFinish=null}
  if(document.querySelector('.vto-entry'))return;
  const section=document.createElement('div');section.className='vto-entry';
  section.innerHTML='<button class="primary" data-vto="camera">TRY IT ON</button><button class="outline" data-vto="viewer">EXPLORE IN 3D ↗</button><p>Live hand tracking · Free 3D shape study · Approximate fit</p><p class="vto-entry-error" role="status"></p>';
  purchase.after(section);
  section.addEventListener('click',async event=>{
   const button=event.target.closest('[data-vto]');if(!button||loading)return;
   loading=true;button.disabled=true;const label=button.textContent;button.textContent='OPENING…';section.querySelector('.vto-entry-error').textContent='';
   try{const {openTryOn}=await import('./tryon/experience.js');if(!button.isConnected)return;await openTryOn({product:p,products:CATALOG,mode:button.dataset.vto,metal:typeof metal==='string'?metal:'Yellow Gold',onReturn:(selected,finish)=>{if(location.hash!==`#product/${selected.id}`){pendingFinish=finish;location.hash=`#product/${selected.id}`}else document.querySelector(`[data-metal="${finish}"]`)?.click()}})}catch(error){section.querySelector('.vto-entry-error').textContent='The 3D viewer could not open. Please retry. '+error.message}finally{loading=false;if(button.isConnected){button.disabled=false;button.textContent=label}}
  });
 }
 new MutationObserver(inject).observe(document.querySelector('main'),{childList:true,subtree:true});inject();
})();
