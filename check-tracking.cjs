// Genuine MediaPipe inference over a moving test-image video stream. No fake landmarks.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))console.log('BROWSER',m.text().slice(0,240))});
  await page.route('**/test-hand.jpg',route=>route.fulfill({path:__dirname+'/test-fixtures/hand.jpg',contentType:'image/jpeg'}));
  await page.goto(process.env.TRYON_BASE||'http://127.0.0.1:8081/#product/p33');
  await page.evaluate(async()=>{
   const {JewelleryRenderer}=await import('/tryon/renderer.js');const render=JewelleryRenderer.prototype.render;
   JewelleryRenderer.prototype.render=function(){window.testRenderer=this;return render.call(this)};
   const image=new Image();image.src='/test-hand.jpg';await image.decode();
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;const c=canvas.getContext('2d');
   window.fixtureOffset=0;window.fixtureBlank=false;window.testStreams=[];
   window.fixtureTimer=setInterval(()=>{c.fillStyle='#171e18';c.fillRect(0,0,640,640);if(!window.fixtureBlank)c.drawImage(image,0,190,640,410,50+window.fixtureOffset,80,530,340)},40);
   navigator.mediaDevices.getUserMedia=async()=>{const stream=canvas.captureStream(25);window.testStreams.push(stream);return stream};
  });
  await page.locator('[data-vto=camera]').click();await page.locator('[data-action=start]').click();
  await page.waitForFunction(()=>document.querySelector('.vto-status')?.dataset.state==='tracking',{timeout:65000});
  const first=await page.evaluate(()=>({position:window.testRenderer.model.position.toArray(),radius:window.testRenderer.model.scale.x}));assert.ok(first.radius>3);
  await page.waitForTimeout(2500);
  const perf=await page.locator('.vto-performance').textContent();console.log(perf);assert.match(perf,/worker/,'Inference should run in the worker on this browser');
  await page.evaluate(()=>window.fixtureOffset=60);await page.waitForTimeout(1800);
  const moved=await page.evaluate(()=>window.testRenderer.model.position.x);assert.ok(moved>first.position[0]+10,'Model follows detected image motion');
  await page.locator('#vto-debug-toggle').check();await page.screenshot({path:'preview-tryon-tracking.png'});await page.locator('#vto-debug-toggle').uncheck();
  await page.evaluate(()=>window.fixtureBlank=true);await page.waitForTimeout(1800);assert.equal(await page.evaluate(()=>window.testRenderer.model.visible),false);assert.equal(await page.locator('[data-action=capture]').isDisabled(),true);
  await page.evaluate(()=>window.fixtureBlank=false);await page.waitForFunction(()=>document.querySelector('.vto-status').dataset.state==='tracking');
  // A new product must replace the GLB in camera mode and stop the old session.
  await page.locator('[data-product=p35]').click();await page.waitForFunction(()=>document.querySelector('.vto-status').dataset.state==='ready');
  assert.equal(await page.evaluate(()=>window.testRenderer.model.userData.productId),'p35');
  assert.match(await page.evaluate(()=>window.testRenderer.model.userData.asset),/horizon-prototype/);
  assert.equal(await page.evaluate(()=>window.testStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))),true);
  await page.locator('[data-action=start]').click();await page.waitForFunction(()=>document.querySelector('.vto-status').dataset.state==='tracking',{timeout:45000});
  await page.locator('[data-finish="White Gold"]').click();
  await page.locator('[data-action=capture]').click();await page.waitForFunction(()=>document.querySelector('.vto-status').dataset.state==='captured');
  assert.equal(await page.evaluate(()=>window.testStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))),true);
  assert.ok(await page.locator('.vto-shot').evaluate(i=>i.complete&&i.naturalWidth>0));
  const composed=await page.evaluate(async()=>{const blob=await fetch(document.querySelector('.vto-shot').src).then(r=>r.blob());return {type:blob.type,size:blob.size}});assert.equal(composed.type,'image/png');assert.ok(composed.size>20000);
  const downloadPromise=page.waitForEvent('download');await page.locator('[data-action=download]').click();const download=await downloadPromise;await download.saveAs(__dirname+'/preview-tryon-capture.png');
  await page.locator('[data-action=retake]').click();await page.waitForFunction(()=>document.querySelector('.vto-status').dataset.state==='tracking',{timeout:45000});
  await page.locator('[data-action=switch]').click();await page.waitForFunction(()=>document.querySelector('.vto-status').dataset.state==='tracking',{timeout:45000});
  await page.locator('.vto-close').click();assert.equal(await page.evaluate(()=>window.testStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))),true);
  assert.deepEqual(errors,[]);console.log('PASS real MediaPipe worker inference, moving-hand fixture alignment, tracking loss, capture/download, retake, camera switch, cleanup');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
