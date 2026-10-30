// Keep computer vision and 3D libraries off the storefront's initial load.
(()=>{
 let loading=false,pendingFinish=null;
 async function inject(){
  let id;try{id=decodeURIComponent(location.hash.replace(/^#product\//,''))}catch{return}
  const p=CATALOG.find(p=>p.id===id);
  const purchase=document.querySelector('.detail-content .purchase');
  if(!purchase||!p)return;
  if(pendingFinish){document.querySelector(`[data-metal="${pendingFinish}"]`)?.click();pendingFinish=null}
  if(document.querySelector('.vto-entry'))return;
  let data;
  try{data=await import('./tryon/products.js')}catch(error){console.error('Product asset registry failed to load',error);return}
  if(!purchase.isConnected||document.querySelector('.vto-entry'))return;
  const asset=data.productAsset(p.id),available=data.hasModel(asset),tryon=available&&asset.category==='ring';
  const photo=document.querySelector('.detail-photo'),image=photo.querySelector('img');image.dataset.productId=p.id;
  const gallery=document.createElement('div');gallery.className='pj-product-gallery';gallery.dataset.productId=p.id;
  const images=asset.gallery.filter(g=>g.url);
  images.forEach((g,index)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label','View '+g.view);b.setAttribute('aria-pressed',index===0);const thumbnail=document.createElement('img');thumbnail.src=g.url;thumbnail.alt='';b.append(thumbnail);b.onclick=()=>{image.src=g.url;image.alt=g.alt;gallery.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b))};gallery.append(b)});
  const note=document.createElement('p'),missing=asset.gallery.filter(g=>!g.url).map(g=>g.view);note.textContent=(images.every(g=>g.verifiedInventory)?'Approved product photographs.':'Catalogue reference.')+(missing.length?' Not supplied: '+missing.join(', ')+'.':'');gallery.append(note);photo.append(gallery);
  const section=document.createElement('div');section.className='vto-entry';
  const cameraButton=p.category==='Rings'?`<button class="primary" data-vto="camera" ${tryon?'':'disabled'}>${tryon?'TRY IT ON':'TRY-ON UNAVAILABLE'}</button>`:'';
  section.innerHTML=cameraButton+`<button class="outline" data-vto="viewer">${available?'EXPLORE IN 3D ↗':'3D AVAILABILITY'}</button><p>${available?(asset.model.status==='prototype'?'Product-specific prototype · Not CAD-verified · Approximate fit':'Product-specific 3D model · Approximate visual fit'):'Product-specific 3D asset not supplied. No substitute model is used.'}</p><p class="vto-entry-error" role="status"></p>`;
  purchase.after(section);
  section.addEventListener('click',async event=>{
   const button=event.target.closest('[data-vto]');if(!button||loading)return;
   loading=true;button.disabled=true;const label=button.textContent;button.textContent='OPENING…';section.querySelector('.vto-entry-error').textContent='';
   try{const {openTryOn}=await import('./tryon/experience.js');if(!button.isConnected)return;await openTryOn({product:p,products:CATALOG,mode:button.dataset.vto,metal:typeof metal==='string'?metal:'Yellow Gold',onReturn:(selected,finish)=>{if(location.hash!==`#product/${selected.id}`){pendingFinish=finish;location.hash=`#product/${selected.id}`}else document.querySelector(`[data-metal="${finish}"]`)?.click()}})}catch(error){section.querySelector('.vto-entry-error').textContent='The 3D viewer could not open. Please retry. '+error.message}finally{loading=false;if(button.isConnected){button.disabled=false;button.textContent=label}}
  });
 }
 new MutationObserver(inject).observe(document.querySelector('main'),{childList:true,subtree:true});inject();
})();
