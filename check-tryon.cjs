const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log('BROWSER',m.text().slice(0,180))});
 await page.goto('http://127.0.0.1:8081/#product/p33');await page.locator('[data-vto=viewer]').click();
 await page.waitForFunction(()=>document.querySelector('.vto-status')?.textContent.includes('Drag to rotate'),{timeout:30000});
 assert.equal(await page.locator('.vto-canvas').count(),1);
 for(const id of ['p35','p40','p33']){await page.locator('[data-product='+id+']').click();await page.waitForFunction(()=>document.querySelector('.vto-status').dataset.state==='ready')}
 await page.locator('[data-finish="Rose Gold"]').click();assert.equal(await page.locator('[data-finish="Rose Gold"]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-action=zoom-in]').click();await page.locator('[data-action=reset]').click();
 await page.screenshot({path:'preview-tryon-desktop.png'});
 await page.locator('[data-mode=camera]').click();assert.equal(await page.locator('video').evaluate(v=>v.srcObject),null);
 await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied for test','NotAllowedError')}});
 await page.locator('[data-action=start]').click();await page.waitForFunction(()=>document.querySelector('.vto-status').textContent.includes('denied'));
 await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Missing for test','NotFoundError')}});
 await page.locator('[data-action=start]').click();await page.waitForFunction(()=>document.querySelector('.vto-status').textContent.includes('No camera'));
 await page.locator('.vto-close').click();assert.equal(await page.locator('.vto-dialog').count(),0);
 await page.setViewportSize({width:390,height:844});await page.locator('[data-vto=viewer]').click();await page.waitForFunction(()=>document.querySelector('.vto-status')?.textContent.includes('Drag to rotate'));
 assert.equal(await page.locator('.vto-dialog').evaluate(d=>d.scrollWidth>d.clientWidth),false);await page.screenshot({path:'preview-tryon-mobile.png'});
 await page.keyboard.press('Escape');assert.equal(await page.locator('.vto-dialog').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS GLB models, finishes, zoom/reset, explicit camera start, denied/unavailable states, dialog cleanup, mobile width');
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
