const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const pw=require('playwright'),root=path.resolve(__dirname,'..'),engine=process.argv[2]||'webkit';
let server,browser;
(async()=>{
 server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let origin='http://127.0.0.1:'+server.address().port;
 browser=await pw[engine].launch();let c=await browser.newContext({viewport:{width:402,height:874},isMobile:true,hasTouch:true});
 await c.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());let p=await c.newPage();p.setDefaultTimeout(15000);
 await p.goto(origin);await p.waitForFunction(()=>document.querySelector('#runtimeStatus').textContent.includes('交互已启用'));
 assert.equal(await p.locator('#sync').evaluate(e=>e.tagName==='DETAILS'&&!e.open),true,'training space starts collapsed');
 assert.equal(await p.locator('#mon').isVisible(),true);assert.equal(await p.locator('#wed').isVisible(),false);
 await p.locator('.quicknav a[href="#wed"]').click();await p.goBack();assert.equal(await p.locator('#mon').isVisible(),true,'Back restores initial training');await p.goForward();assert.equal(await p.locator('#wed').isVisible(),true);
 await p.locator('.quicknav a[href="#mon"]').click();await p.locator('a[href="#cardio"]').first().click();await p.locator('.quicknav a[href="#fri"]').click();await p.goBack();assert.equal(await p.locator('#mon').isVisible(),true,'Back to shared section restores its training context');
 for(let id of ['wed','fri','mon','fri']){await p.locator('.quicknav a[href="#'+id+'"]').click();assert.equal(await p.locator('.workout-day:visible').count(),1);assert.equal(await p.locator('#'+id).isVisible(),true);}
 for(const id of ['posture','diet','history']){
  assert.equal(await p.locator('#'+id).isVisible(),false);
  await p.locator('.extras-menu > summary').tap();
  await p.locator('.extras-menu a[href="#'+id+'"]').tap();
  assert.equal(await p.locator('#'+id).isVisible(),true);
  assert.equal(await p.locator('.extras-menu').evaluate(e=>e.open),false);
  await p.locator('.quicknav a[href="#fri"]').tap();
  assert.equal(await p.locator('#'+id).isVisible(),false);
  assert.equal(await p.locator('#warmup').evaluate(e=>e.getBoundingClientRect().top)<await p.locator('#fri').evaluate(e=>e.getBoundingClientRect().top),true);
 }
 await p.goto(origin);assert.equal(await p.locator('#fri').isVisible(),true,'last viewed training survives reopen');
 await p.goto(origin+'/#wed-glute');assert.equal(await p.locator('#wed').isVisible(),true,'direct machine link selects its training');
 assert.equal(await p.locator('.machine-guide').count(),15);assert.equal(await p.locator('#wed-glute .machine-guide').evaluate(e=>e.open),false);
 await p.locator('#wed-glute .machine-guide > summary').click();assert.equal(await p.locator('#wed-glute .machine-guide ol').isVisible(),true);assert.equal(await p.locator('#wed-glute .machine-guide .caution').isVisible(),true);
 assert.equal(await p.locator('.video-publisher,.video-note,.profile-help').count(),0);
 await p.locator('#wed-glute input.load').fill('13.75');await p.locator('#wed-glute input.load').blur();await p.locator('.quicknav a[href="#fri"]').click();assert.equal(await p.locator('#fri-glute input.load').inputValue(),'13.75');
 await p.goto(origin+'/#sync');assert.equal(await p.locator('#sync').evaluate(e=>e.open),true);
 await p.screenshot({path:path.join(root,'test-results/compact-'+engine+'.png')});await c.close();
 c=await browser.newContext({javaScriptEnabled:false});p=await c.newPage();await p.goto(origin);
 for(let id of ['mon','wed','fri'])assert.equal(await p.locator('#'+id).isVisible(),true);
 await p.locator('#wed-glute .machine-guide > summary').click();assert.equal(await p.locator('#wed-glute ol').isVisible(),true,'instructions available without scripts');await c.close();
 console.log(engine+': compact layout, A/B/C switching, persistence, deep links, weights and no-JS fallback passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)server.close();});
