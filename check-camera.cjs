const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--enable-unsafe-swiftshader','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 try{
  const context=await browser.newContext({permissions:['camera']});const page=await context.newPage();
  await page.goto('http://127.0.0.1:8081/#product/p33');await page.locator('[data-vto=camera]').click();
  await page.waitForFunction(()=>document.querySelector('.vto-status')?.textContent.includes('Start camera'));
  await page.locator('[data-action=start]').click();
  await page.waitForFunction(()=>document.querySelector('.vto-video').srcObject?.active);
  await page.evaluate(()=>window.grantedStream=document.querySelector('.vto-video').srcObject);
  await page.locator('.vto-close').click();
  assert.equal(await page.evaluate(()=>window.grantedStream.getTracks().every(t=>t.readyState==='ended')),true);
  assert.equal(await page.locator('.vto-dialog').count(),0);
  console.log('PASS native getUserMedia granted with browser synthetic camera; cleanup during tracking initialization');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
