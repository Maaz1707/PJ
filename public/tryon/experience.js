import {JewelleryRenderer} from './renderer.js';
import {CameraSession,cameraError} from './camera.js';
import {HandTracker} from './hand-tracker.js';
import {ringTransform,TransformSmoother,imageRect,FINGERS} from './tracking.js';
import {METALS,tryOnProduct,hasModel} from './products.js';
import {capturePhoto} from './capture.js';
let active;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function openTryOn({product,products,mode='viewer',metal='Yellow Gold',onReturn}){
 active?.();const trigger=document.activeElement;
 const dialog=document.createElement('dialog');dialog.className='vto-dialog';dialog.setAttribute('aria-labelledby','vto-title');
 dialog.innerHTML=`<header class="vto-header"><div><p>THE PARAG ATELIER</p><h2 id="vto-title">A closer kind of sparkle.</h2></div><button class="vto-close" aria-label="Close try-on">×</button></header>
 <div class="vto-body"><div class="vto-visual"><div class="vto-tabs" role="group" aria-label="Experience mode"><button data-mode="viewer" aria-pressed="true">Explore in 3D</button><button data-mode="camera" aria-pressed="false">Live try-on</button></div>
 <div class="vto-stage"><div class="vto-media"><video class="vto-video" autoplay playsinline muted hidden></video><div class="vto-render"></div><canvas class="vto-debug" hidden></canvas></div><img class="vto-shot" alt="Your captured virtual ring try-on" hidden><div class="vto-guide" hidden><span>✦</span><p>See a little sparkle on your hand.</p><small>Your camera opens only when you choose Start camera.</small></div><div class="vto-asset-state" hidden><h3>3D asset not yet available</h3><p></p><button data-action="retry" hidden>Retry model</button></div><span class="vto-demo-badge"></span></div>
 <p class="vto-status" role="status" aria-live="polite">Loading the 3D ring…</p><div class="vto-tools"><button data-action="reset">Reset view</button><button data-action="zoom-in" aria-label="Zoom in">＋</button><button data-action="zoom-out" aria-label="Zoom out">−</button><button data-action="fullscreen">Fullscreen</button><button data-action="switch" hidden>Switch camera</button><button data-action="stop" hidden>Stop camera</button></div></div>
 <aside class="vto-panel"><p class="vto-eyebrow">YOUR SELECTED PIECE</p><h3 class="vto-product-name"></h3><p class="vto-price"></p><p class="vto-disclaimer">Explore with an original 3D shape study. It is not an exact model of the photographed product. Fit and stone appearance are approximate.</p>
 <div class="vto-gallery" aria-label="Selected product photography"></div>
 <p class="vto-label">Metal finish</p><div class="vto-metals">${Object.keys(METALS).map(m=>`<button data-finish="${m}" aria-label="${m}" title="${m}"><span></span><small>${m}</small></button>`).join('')}</div>
 <div class="vto-camera-settings" hidden><label for="vto-finger">Finger</label><select id="vto-finger">${Object.keys(FINGERS).map(f=>`<option value="${f}" ${f==='ring'?'selected':''}>${f[0].toUpperCase()+f.slice(1)} finger</option>`).join('')}</select><label for="vto-fit">Visual fit <output id="vto-fit-value">100%</output></label><input id="vto-fit" type="range" min="70" max="140" value="100" step="2"><small>Visual adjustment only. Does not measure your ring size.</small><label class="vto-debug-label"><input id="vto-debug-toggle" type="checkbox"> Show tracking landmarks</label></div>
 <button class="vto-primary" data-action="start" hidden>START CAMERA</button><button class="vto-primary" data-action="capture" hidden disabled>CAPTURE PHOTO</button>
 <div class="vto-photo-actions" hidden><button data-action="download">Download photo</button><button data-action="share" hidden>Share photo</button><button data-action="retake">Retake</button></div>
 <p class="vto-privacy">Camera frames are processed on this device. Nothing is uploaded or saved automatically. Photos stay in this session until you download or share them.</p>
 <button class="vto-return" data-action="return">RETURN TO PRODUCT →</button><details class="vto-help"><summary>Tips for a steadier fit</summary><p>Use even light and show the back of one open hand. Keep the finger base visible and avoid fast motion. The model hides when tracking is lost. This preview cannot reproduce precise skin occlusion, diamond optics or physical fit.</p><p class="vto-performance"></p></details>
 </aside></div><section class="vto-selection"><p>EXPLORE PRODUCT DESIGNS · 3D AVAILABILITY VARIES</p><div>${products.map(p=>`<button data-product="${esc(p.id)}" aria-label="Select ${esc(p.name)}"><img src="/assets/${esc(p.image)}" alt="" loading="lazy"><span>${esc(p.name)}</span></button>`).join('')}</div></section>`;
 document.body.append(dialog);dialog.showModal();
 const $=s=>dialog.querySelector(s),$$=s=>[...dialog.querySelectorAll(s)],action=name=>$(`[data-action="${name}"]`);
 const stage=$('.vto-stage'),video=$('video'),media=$('.vto-media');
 let renderer,camera,tracker,closed=false,operation=0,selection=0,frame,photoUrl,photoBlob,photoGeneration=0,capturing=false,currentProduct=product,currentMode='viewer',running=false,lastSeen=0,lastResult=null,lastInference=0,modelReady=false;
 let asset=tryOnProduct(product),config=asset.trackingConfig;
 const smoother=new TransformSmoother();
 const status=(text,state='idle')=>{if(closed)return;const node=$('.vto-status');if(node.textContent!==text)node.textContent=text;if(node.dataset.state!==state)node.dataset.state=state};
 const revokePhoto=()=>{photoGeneration++;if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=null;photoBlob=null;$('.vto-shot').hidden=true;$('.vto-shot').removeAttribute('src');$('.vto-photo-actions').hidden=true};
 function stopCamera(){operation++;running=false;tracker?.close();tracker=null;camera?.stop();lastResult=null;lastSeen=0;smoother.reset();if(currentMode==='camera')renderer?.transform(null);video.hidden=true;action('capture').disabled=true;action('capture').hidden=true;action('stop').hidden=true;action('switch').hidden=true;action('start').disabled=false;action('start').hidden=currentMode!=='camera';$('.vto-guide').hidden=currentMode!=='camera'||!!photoBlob;}
 function cleanup(){if(closed)return;closed=true;stopCamera();cancelAnimationFrame(frame);renderer?.dispose();revokePhoto();dialog.remove();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',cleanup);window.removeEventListener('hashchange',cleanup);if(active===cleanup)active=null;if(trigger?.isConnected)trigger.focus()}
 active=cleanup;$('.vto-close').onclick=()=>{dialog.close();cleanup()};dialog.addEventListener('close',cleanup);dialog.addEventListener('cancel',()=>cleanup());
 function visibility(){if(document.hidden&&(running||camera?.stream||tracker)){stopCamera();status('Camera paused while this tab is hidden. Choose Start camera to resume.')}}
 document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',cleanup);window.addEventListener('hashchange',cleanup);
 function finish(name){
  if(!asset.variants[name])return;metal=name;renderer?.material(name);$$('[data-finish]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.finish===name));
  const target=asset.variants[name].modelUrl||asset.model.glb;
  if(modelReady&&renderer.model?.userData.asset!==target){stopCamera();loadModel()}
 }
 function gallery(){
  const images=asset.gallery.filter(g=>g.url),missing=asset.gallery.filter(g=>!g.url).map(g=>g.view);
  $('.vto-gallery').innerHTML=`<p class="vto-label">PRODUCT PHOTOGRAPHY</p><img class="vto-reference-photo" src="${esc(images[0].url)}" alt="${esc(images[0].alt)}"><div class="vto-gallery-thumbs">${images.map((g,i)=>`<button data-gallery="${i}" aria-label="View ${esc(g.view)}" aria-pressed="${i===0}"><img src="${esc(g.url)}" alt=""></button>`).join('')}</div><small>${images.every(g=>g.verifiedInventory)?'Approved product photographs.':'Catalogue reference · inventory photography not verified.'}${missing.length?'<br>Not supplied: '+esc(missing.join(', '))+'.':''}</small>`;
  $$('[data-gallery]').forEach(b=>b.onclick=()=>{const g=images[+b.dataset.gallery];$('.vto-reference-photo').src=g.url;$('.vto-reference-photo').alt=g.alt;$$('[data-gallery]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
 }
 async function selectProduct(p){
  selection++;stopCamera();revokePhoto();modelReady=false;renderer.clear();currentProduct=p;asset=tryOnProduct(p);config=asset.trackingConfig;
  $('#vto-finger').value=config?.finger||'ring';$('#vto-fit').value=100;$('#vto-fit-value').textContent='100%';smoother.reset();
  $('.vto-product-name').textContent=p.name;$('.vto-price').textContent='₹'+p.price.toLocaleString('en-IN')+' · reference price';dialog.dataset.productId=p.id;dialog.dataset.assetStatus=asset.model.status;
  $('.vto-disclaimer').textContent=asset.model.description+(asset.model.status==='prototype'?' Product-specific prototype, not an exact CAD replica. Fit and stone appearance are approximate.':'');
  $('.vto-demo-badge').textContent=asset.model.status==='prototype'?'PRODUCT-SPECIFIC PROTOTYPE':hasModel(asset)?'PRODUCT 3D MODEL':'3D ASSET NOT SUPPLIED';
  $$('[data-product]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.product===p.id));$$('[data-finish]').forEach(b=>b.disabled=!hasModel(asset)||!asset.variants[b.dataset.finish]);
  $('[data-mode="camera"]').disabled=!asset.canTryOn;action('start').disabled=true;gallery();finish(asset.variants[metal]?metal:Object.keys(asset.variants)[0]);
  if(!asset.canTryOn&&currentMode==='camera')setMode('viewer');
  await loadModel();
 }
 async function loadModel(){
  const ticket=selection,selected=asset;modelReady=false;action('capture').disabled=true;action('start').disabled=true;action('retry').hidden=true;
  if(!hasModel(selected)){
   renderer.clear();$('.vto-guide').hidden=true;$('.vto-asset-state').hidden=false;$('.vto-asset-state h3').textContent='3D asset not yet available';$('.vto-asset-state p').textContent=`${selected.name} (${selected.sku}) needs its own approved GLB. Browse its reference photo; no substitute model is used.`;status('Product-specific model missing. Camera try-on is unavailable.','missing');return;
  }
  $('.vto-asset-state').hidden=true;$('.vto-guide').hidden=currentMode!=='camera';status(`Loading ${selected.name}…`,'loading');
  const variant=selected.variants[metal],modelAsset=variant.modelUrl?{...selected,model:{...selected.model,glb:variant.modelUrl,version:selected.model.version+':'+metal}}:selected;
  try{const loaded=await renderer.load(modelAsset,progress=>{if(closed||ticket!==selection)return;const amount=progress.total?Math.round(progress.loaded/progress.total*100)+'%':Math.round(progress.loaded/1024)+' KB';status(`Loading ${selected.name} · ${amount}${progress.cached?' · cached':''}`,'loading')});
   if(closed||ticket!==selection||!loaded)return;modelReady=true;action('start').disabled=!selected.canTryOn;status(currentMode==='camera'?'Ready when you are. Choose Start camera.':'Drag to rotate · pinch or scroll to zoom.','ready');
  }catch(error){if(closed||ticket!==selection)return;$('.vto-guide').hidden=true;$('.vto-asset-state').hidden=false;$('.vto-asset-state h3').textContent='This product’s 3D model could not load';$('.vto-asset-state p').textContent=error.message+'. No substitute model is shown.';action('retry').hidden=false;status('Model unavailable. Retry or select a different product.','error')}
 }
 function setMode(next){stopCamera();revokePhoto();currentMode=next==='camera'&&!asset.canTryOn?'viewer':next;renderer.setMode(currentMode);media.classList.remove('vto-mirrored');$('.vto-guide').hidden=currentMode!=='camera'||!hasModel(asset);$('.vto-camera-settings').hidden=currentMode!=='camera';action('start').hidden=currentMode!=='camera';action('start').disabled=!modelReady||!asset.canTryOn;['reset','zoom-in','zoom-out'].forEach(n=>action(n).hidden=currentMode==='camera');$$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===currentMode));if(!hasModel(asset))status('Product-specific model missing. Camera try-on is unavailable.','missing');else status(currentMode==='camera'?'Your camera stays off until you choose Start camera.':'Drag to rotate · pinch or scroll to zoom.')}
 async function start(facing=camera.facing){
  if(!modelReady||!asset.canTryOn){status('A product-specific ring model must be available before starting the camera.','error');return}
  stopCamera();revokePhoto();const id=operation;action('start').disabled=true;status('Requesting camera access…');
  try{
   const started=await camera.start(facing);if(closed||id!==operation||!started)return;
   video.hidden=false;media.classList.toggle('vto-mirrored',camera.facing==='user');$('.vto-guide').hidden=true;action('stop').hidden=false;
   status('Loading private, on-device hand tracking…');
   tracker=new HandTracker((landmarks,ms)=>{lastResult=landmarks;lastInference=ms;lastSeen=landmarks?performance.now():0;$('.vto-performance').textContent=`Measured inference: ${ms.toFixed(0)} ms · ${tracker?.engine||'local'} · one hand`;});
   const task=tracker;task.onError=error=>{stopCamera();status(`Hand tracking stopped: ${error.message}. Choose Start camera to retry.`,'error')};
   await task.init();if(closed||id!==operation){task.close();return}
   running=true;action('start').hidden=true;action('capture').hidden=false;action('switch').hidden=false;action('stop').hidden=false;status('Show the back of one open hand.','searching');
   camera.stream?.getVideoTracks()[0].addEventListener('ended',()=>{if(running){stopCamera();status('Camera disconnected. Choose Start camera to retry.','error')}},{once:true});
  }catch(error){if(closed||id!==operation)return;stopCamera();status(cameraError(error),'error')}
 }
 function drawLandmarks(rect){const canvas=$('.vto-debug');canvas.hidden=!$('#vto-debug-toggle').checked;if(canvas.hidden)return;canvas.width=renderer.width;canvas.height=renderer.height;const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);if(!lastResult)return;c.strokeStyle='#8bffbc';c.fillStyle='#fff';c.lineWidth=1.5;for(const chain of [[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17]]){c.beginPath();chain.forEach((i,n)=>{const p=lastResult[i];c[n?'lineTo':'moveTo'](rect.x+p.x*rect.width,rect.y+p.y*rect.height)});c.stroke()}for(const p of lastResult){c.beginPath();c.arc(rect.x+p.x*rect.width,rect.y+p.y*rect.height,2.5,0,Math.PI*2);c.fill()}}
 async function capture(){if(capturing)return;capturing=true;const generation=photoGeneration,id=operation;try{if(!running||performance.now()-lastSeen>250)throw Error('Wait for a steady hand detection before capturing.');const blob=await capturePhoto(video,renderer,camera.facing==='user');if(closed||generation!==photoGeneration||id!==operation)return;photoBlob=blob;photoUrl=URL.createObjectURL(photoBlob);$('.vto-shot').src=photoUrl;$('.vto-shot').hidden=false;stopCamera();$('.vto-guide').hidden=true;action('start').hidden=true;$('.vto-photo-actions').hidden=false;action('share').hidden=!(navigator.canShare?.({files:[new File([photoBlob],'parag-try-on.png',{type:'image/png'})]}));status('Photo ready. Camera is now off. Download, share or retake.','captured')}catch(error){status(error.message,'error')}finally{capturing=false}}
 action('download').onclick=()=>{if(!photoUrl)return;const a=document.createElement('a');a.href=photoUrl;a.download='parag-jewellers-try-on.png';a.click()};
 action('share').onclick=async()=>{try{if(photoBlob)await navigator.share({files:[new File([photoBlob],'parag-try-on.png',{type:'image/png'})],title:'My Parag Jewellers 3D shape study'})}catch(error){if(error.name!=='AbortError')status('Sharing failed. You can still download this photo.','error')}};
 action('retake').onclick=()=>start();action('capture').onclick=capture;action('start').onclick=()=>start();action('switch').onclick=()=>start(camera.facing==='user'?'environment':'user');action('stop').onclick=()=>{stopCamera();status('Camera is off. You can restart whenever you like.')};
 action('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(dialog.requestFullscreen)await dialog.requestFullscreen();else status('Fullscreen is unavailable in this browser. The viewer already fits the screen.')}catch(error){status('Fullscreen is unavailable in this browser.','error')}};
 action('return').onclick=()=>{const p=currentProduct,m=metal;dialog.close();cleanup();onReturn?.(p,m)};
 $$('.vto-metals button').forEach(b=>b.onclick=()=>{if(photoBlob){revokePhoto();status('Finish changed. Start the camera to take another photo.');action('start').hidden=currentMode!=='camera'}finish(b.dataset.finish)});
 $$('[data-product]').forEach(b=>b.onclick=()=>selectProduct(products.find(p=>p.id===b.dataset.product)));
 action('retry').onclick=()=>loadModel();$('#vto-finger').onchange=()=>{if(config)config.finger=$('#vto-finger').value;smoother.reset()};$('#vto-fit').oninput=()=>{if(config)config.scaleMultiplier=asset.model.tracking.scaleMultiplier*+$('#vto-fit').value/100;$('#vto-fit-value').textContent=$('#vto-fit').value+'%'};
 try{
  renderer=new JewelleryRenderer($('.vto-render'));camera=new CameraSession(video);
  renderer.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();stopCamera();status('3D graphics were interrupted. Close and reopen the viewer to retry.','error')});
  action('reset').onclick=()=>renderer.reset();action('zoom-in').onclick=()=>renderer.zoom(.85);action('zoom-out').onclick=()=>renderer.zoom(1.18);
  $$('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));setMode(mode);await selectProduct(product);
  if(closed)return;
  const tick=now=>{if(closed)return;try{
   if(running&&modelReady){tracker.frame(video,now);const rect=imageRect(renderer.width,renderer.height,video.videoWidth,video.videoHeight);const value=now-lastSeen<250?ringTransform(lastResult,rect,config):null;renderer.transform(value?smoother.update(value,now):null);if(!value)smoother.reset();action('capture').disabled=!value||!modelReady||capturing;if(value)status('Hand tracked · approximate fit','tracking');else status('Looking for your hand. Show the finger base in even light.','searching');drawLandmarks(rect)}
   renderer.render();
  }catch(error){stopCamera();status(`The preview stopped: ${error.message}. Close and reopen to retry.`,'error')}
  frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);
 }catch(error){stopCamera();status(`3D preview unavailable: ${error.message}. Your browser needs WebGL. You can still browse the product photos.`,'error')}
}
