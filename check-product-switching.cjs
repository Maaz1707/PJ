const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('.glb'))requests.push(r.url())});
  await page.goto(process.env.TRYON_BASE||'http://127.0.0.1:8081/#product/p33');
  await page.evaluate(async()=>{const {JewelleryRenderer}=await import('/tryon/renderer.js');const render=JewelleryRenderer.prototype.render;JewelleryRenderer.prototype.render=function(){window.testRenderer=this;return render.call(this)}});
  await page.locator('[data-vto=viewer]').click();
  const ready=id=>page.waitForFunction(id=>document.querySelector('.vto-dialog')?.dataset.productId===id&&document.querySelector('.vto-status')?.dataset.state==='ready'&&window.testRenderer?.model?.userData.productId===id,id);
  const geometry=()=>page.evaluate(()=>{const r=window.testRenderer;let vertices=0,checksum=0,meshes=0;r.model.traverse(o=>{if(!o.isMesh)return;meshes++;vertices+=o.geometry.attributes.position.count;for(const n of o.geometry.attributes.position.array)checksum+=n*n});return {id:r.model.userData.productId,url:r.model.userData.asset,vertices,meshes,checksum,camera:r.perspective.position.toArray(),target:r.controls.target.toArray()}});
  const results=[];
  for(const id of ['p33','p35','p40']){
   if(id!=='p33')await page.locator(`[data-product=${id}]`).click();await ready(id);const result=await geometry();results.push(result);
   assert.match(result.url,/models\/jewellery\/rings\//);assert.equal(await page.locator('.vto-reference-photo').getAttribute('src'),'/assets/catalog-'+id.slice(1)+'.jpg');
   for(const finish of ['White Gold','Rose Gold','Yellow Gold']){const count=requests.length;await page.locator(`[data-finish="${finish}"]`).click();assert.equal(requests.length,count);const state=await geometry();assert.equal(state.id,id);assert.equal(state.checksum,result.checksum);const correct=await page.evaluate(async name=>{const {METALS}=await import('/tryon/products.js');const colors=[];window.testRenderer.model.traverse(o=>{if(o.isMesh&&o.material.name==='metal')colors.push(o.material.color.getHex())});return colors.length>0&&colors.every(c=>c===METALS[name].color)},finish);assert.equal(correct,true)}
   const framed=await page.evaluate(()=>{const r=window.testRenderer,b=r.model;let inside=true;b.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i+=20){const v=o.localToWorld(a.isBufferAttribute?new o.position.constructor(a.getX(i),a.getY(i),a.getZ(i)):o.position.clone()).project(r.perspective);if(Math.abs(v.x)>1||Math.abs(v.y)>1)inside=false}});return inside});assert.equal(framed,true,'Product geometry is inside the camera frame');
   if(id==='p33'){const box=await page.locator('.vto-stage').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+90,box.y+box.height/2+20,{steps:8});await page.mouse.up();await page.waitForTimeout(300);assert.notDeepEqual((await geometry()).camera,result.camera);await page.locator('[data-action=reset]').click()}
   await page.waitForTimeout(400);await page.locator('.vto-dialog').screenshot({path:`preview-product-${id}.png`});
  }
  assert.equal(new Set(results.map(r=>r.url)).size,3);assert.equal(new Set(results.map(r=>r.vertices+':'+r.checksum)).size,3);
  const fetched=requests.length;await page.locator('[data-product=p33]').click();await ready('p33');assert.equal(requests.length,fetched,'Product cache avoids refetching');
  // Delay one model and select another: stale geometry must never win.
  await page.route('**/models/jewellery/rings/horizon-prototype.glb',async route=>{await new Promise(r=>setTimeout(r,700));try{await route.continue()}catch{}});
  await page.evaluate(()=>window.testRenderer.cache.clear());
  await page.locator('[data-product=p35]').click();await page.locator('[data-product=p40]').click();await ready('p40');await page.waitForTimeout(900);assert.equal((await geometry()).id,'p40');
  await page.unroute('**/models/jewellery/rings/horizon-prototype.glb');
  // Absent assets across categories must show no old model, not a generic fallback.
  const {ids}=await page.evaluate(async()=>{const {ASSET_REGISTRY}=await import('/tryon/products.js');return {ids:['ring','earring','necklace','bracelet'].flatMap(category=>Object.values(ASSET_REGISTRY).filter(a=>a.category===category&&a.model.status==='missing').slice(0,2).map(a=>a.id))}});
  for(const id of ids){await page.locator(`[data-product=${id}]`).click();await page.waitForFunction(()=>document.querySelector('.vto-status').dataset.state==='missing');assert.equal(await page.evaluate(()=>window.testRenderer.model),null);assert.equal(await page.locator('[data-mode=camera]').isDisabled(),true);assert.ok(await page.locator('.vto-reference-photo').getAttribute('src'))}
  // Valid record with a broken asset must not retain earlier geometry.
  await page.route('**/models/jewellery/rings/circular-gleam-prototype.glb',route=>route.fulfill({status:404,body:'Missing'}));await page.evaluate(()=>window.testRenderer.cache.clear());
  await page.locator('[data-product=p33]').click();await page.waitForFunction(()=>document.querySelector('.vto-status').dataset.state==='error');assert.equal(await page.evaluate(()=>window.testRenderer.model),null);
  await page.unroute('**/models/jewellery/rings/circular-gleam-prototype.glb');await page.locator('[data-action=retry]').click();await ready('p33');
  await page.locator('[data-product=p35]').click();await ready('p35');await page.locator('[data-finish="Rose Gold"]').click();await page.locator('[data-action=return]').click();await page.waitForURL('**/#product/p35');await page.waitForFunction(()=>document.querySelector('[data-metal="Rose Gold"]').getAttribute('aria-pressed')==='true');
  assert.equal(await page.locator('.pj-product-gallery').getAttribute('data-product-id'),'p35');
  await page.setViewportSize({width:390,height:844});await page.locator('[data-vto=viewer]').click();await ready('p35');assert.equal(await page.locator('.vto-dialog').evaluate(d=>d.scrollWidth>d.clientWidth),false);
  await page.keyboard.press('Escape');assert.deepEqual(errors,[]);console.log(JSON.stringify(results));console.log('PASS three genuinely different catalogue products load distinct prototype geometry; cache, variant-only changes, rapid switching, missing assets, failed loads/retry, gallery and product return');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
