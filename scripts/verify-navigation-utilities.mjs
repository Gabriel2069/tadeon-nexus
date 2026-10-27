import { installDesignFonts } from "./design-font-fixtures.mjs";
/** NEX-003 browser fixtures. No credentials, live backend or persisted writes.
 * Uses the same externally supplied Playwright/Chromium as the header audit.
 * Run after `npm run check`; artifacts stay outside the repository by default.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
const { chromium } = await import(process.env.NEXUS_BROWSER_MODULE || "playwright-core");
const root = resolve(process.env.NEXUS_AUDIT_OUTPUT || "/tmp/nexus-navigation-utilities");
const port = Number(process.env.NEXUS_AUDIT_PORT || 6132);
mkdirSync(root, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.NEXUS_CHROMIUM_PATH, args: JSON.parse(process.env.NEXUS_CHROMIUM_ARGS || "[]") });
const server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--strictPort", "--port", String(port)], { detached: true, stdio: ["ignore", "pipe", "pipe"] });
const userId = "00000000-0000-4000-8000-000000000001";
const user = { id: userId, aud: "authenticated", role: "authenticated", email: "fixture@nexus.test", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
const token = [{ alg: "HS256", typ: "JWT" }, { sub: userId, aud: "authenticated", role: "authenticated", exp: 2000000000 }, "fixture"].map(x => typeof x === "string" ? x : Buffer.from(JSON.stringify(x)).toString("base64url")).join(".");
const sheets = Array.from({ length: 5 }, (_, i) => ({ id: `00000000-0000-4000-8000-${String(i + 10).padStart(12, "0")}`, owner_id: userId, name: i === 0 ? "A guardiã dos vestígios que permaneceram além do último limiar" : `Personagem de exemplo ${i + 1}`, occupation: "Leitora de vestígios", exposure: i * 5 }));
const results = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const people = [
 {id:userId,full_name:"Tadeu de exemplo",email:user.email,role:"mestre"},
 {id:"00000000-0000-4000-8000-000000000002",full_name:"A guardiã dos vestígios que permaneceram além do último limiar",email:"guardia@nexus.test",role:"jogador"},
 {id:"00000000-0000-4000-8000-000000000003",full_name:"Cronista",email:"cronista@nexus.test",role:"espectador"}
];
try {
 let serverLog="", serverExit=null;
 const capture=chunk=>{serverLog=(serverLog+chunk.toString()).slice(-12000);};
 server.stdout.on("data",capture);server.stderr.on("data",capture);
 server.on("exit",code=>{serverExit=code??-1;});
 const startupDeadline=Date.now()+120000;let ready=false;
 while(Date.now()<startupDeadline && serverExit===null) {
  try {const response=await fetch(`http://127.0.0.1:${port}/`,{signal:AbortSignal.timeout(5000)});if(response.status<500){ready=true;break;}} catch {/* Server startup is still in progress. */}
  await new Promise(resolve=>setTimeout(resolve,400));
 }
 writeFileSync(`${root}/server.log`,serverLog);
 if(!ready)throw new Error(`Vite did not become ready. Exit: ${serverExit}\n${serverLog}`);
 for(const width of JSON.parse(process.env.NEXUS_AUDIT_WIDTHS||"[320,390,820,1440]")) {
  const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<768,reducedMotion:"reduce",acceptDownloads:true});
  const page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));let usersError=false;let writes=0;let listCount=0;
  await page.addInitScript(({user,token})=>{
   localStorage.setItem("sb-nkxpstyfrzufsnowjrdi-auth-token",JSON.stringify({access_token:token,refresh_token:"fixture",token_type:"bearer",expires_in:86400,expires_at:2000000000,user}));
   localStorage.setItem("tadeon.nexus.offline.v2."+user.id+".mestre",JSON.stringify({version:1,updatedAt:new Date().toISOString(),sheetSummaries:[{id:"local-a",name:"A guardiã local",occupation:"Tecelã",exposure:12},{id:"local-b",name:"O cronista",exposure:3}],sheets:{"local-a":{stats:{pv_current:12},attributes:{FOR:2}}}}));
  },{user,token});
  await page.route("**/*.supabase.co/**",async r=>{
   const req=r.request(),url=new URL(req.url());let body=[];
   if(!["GET","HEAD","OPTIONS"].includes(req.method()) && !url.pathname.endsWith("/rpc/project_heartbeat")){writes++;throw new Error("Unexpected backend mutation in read-only fixture");}
   if(url.pathname.endsWith("/user"))body=user;
   else if(url.pathname.includes("/profiles"))body=[{id:userId,email:user.email,full_name:"Tadeu de exemplo"}];
   else if(url.pathname.includes("/user_roles"))body=[{user_id:userId,role:"mestre"}];
   else if(url.pathname.includes("/feature_flags"))body=[{key:"nexus_knowledge_enabled",enabled:true}];
   else if(url.pathname.includes("/character_sheets"))body=sheets;
   else if(url.pathname.includes("/game_settings"))body=[{id:"00000000-0000-4000-8000-000000000099",key:"global",rules_version:1,updated_at:"2026-10-15T00:00:00Z"}];
   else if(url.pathname.includes("project_heartbeat"))body="2026-10-15T00:00:00Z";
   if(Array.isArray(body)&&req.headers().accept?.includes("vnd.pgrst.object"))body=body[0]||null;
   await r.fulfill({status:200,contentType:"application/json",headers:{"content-range":"0-4/5"},body:JSON.stringify(body)});
  });
  await page.route("**/_serverFn/**",async r=>{
   assert(r.request().method()==="GET","No real role or deletion mutation is permitted in browser fixture");listCount++;
   await r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(usersError?{error:{message:"Fixture unavailable"}}:{result:{users:people},context:{}})});
  });
  await installDesignFonts(page);
  const geometry=async label=>{
   const result=await page.evaluate(()=>({rows:[...document.querySelectorAll('.tadeon-user-row')].map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,inside:r.x>=0&&r.right<=innerWidth};}),headingWidth:document.querySelector("h1")?.getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth,h1:document.querySelectorAll("h1").length,boundary:document.body.textContent.includes("Something went wrong")}));
   assert(result.headingWidth>100&&!result.overflow&&result.h1===1&&!result.boundary,`${label}/${width}: structure ${JSON.stringify(result)}`);assert(!errors.length,errors.join("\n"));
   if(process.env.NEXUS_SKIP_SCREENSHOTS!=="1")await page.screenshot({path:`${root}/${label}-${width}.png`,fullPage:true});
   results.push({width,label,...result,errors:[...errors]});writeFileSync(`${root}/results.json`,JSON.stringify(results,null,2));console.log(`${width}: ${label}`);
  };
  await page.goto(`http://127.0.0.1:${port}/offline`,{waitUntil:"domcontentloaded"});
  await page.getByRole("heading",{name:"Consulta offline",exact:true,level:1}).waitFor({timeout:180000});
  await page.getByText("A guardiã local",{exact:true}).waitFor();
  await geometry("offline");
  await page.emulateMedia({reducedMotion:"no-preference"});
  if(width<768 && process.env.NEXUS_AUDIT_SCOPE !== "utilities") {
   const opener=page.getByRole("button",{name:"Abrir menu",exact:true});await opener.click();const drawer=page.getByRole("dialog",{name:"Navegação principal",exact:true});await drawer.waitFor();
   await page.waitForTimeout(250);assert(await drawer.evaluate(e=>e.contains(document.activeElement)),"Drawer opening focus");
   const opening=await drawer.evaluate(e=>({animation:getComputedStyle(e).animationName,transform:getComputedStyle(e).transform}));assert(opening.animation==="tadeon-navigation-enter",`Drawer owns directional animation: ${JSON.stringify(opening)}`);
   await drawer.getByRole("button",{name:"Conta",exact:true}).click();const account=page.getByRole("dialog",{name:"Configurações da Conta",exact:true});await account.waitFor();await drawer.waitFor({state:"hidden"});await page.waitForTimeout(250);assert(await account.evaluate(e=>e.contains(document.activeElement)),"Account handoff focus");await page.keyboard.press("Escape");await account.waitFor({state:"hidden"});
   const more=page.getByRole("button",{name:"Mais",exact:true});
   const menu=page.getByRole("menu",{name:"Outras áreas"});
   const auditWheel=async height=>{
    await page.setViewportSize({width,height});await more.click();await menu.waitFor();await menu.evaluate(e=>Promise.all(e.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
    const radial=await menu.evaluate(e=>{
     const rect=r=>({x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom});
     return {layout:e.dataset.layout,frame:rect(e.getBoundingClientRect()),targets:[...e.querySelectorAll('[role="menuitem"]')].map(n=>({name:n.textContent||n.getAttribute("aria-label"),...rect(n.getBoundingClientRect())})),animation:getComputedStyle(e).animationName};
    });
    writeFileSync(`${root}/wheel-${width}-${height}.json`,JSON.stringify(radial,null,2));
    if(process.env.NEXUS_SKIP_SCREENSHOTS!=="1")await page.screenshot({path:`${root}/menu-${width}-${height}.png`});
    assert(radial.animation==="tadeon-more-open","Wheel owns its finite opening motion");
    assert(radial.layout==="radial"&&Math.abs(radial.frame.width-radial.frame.height)<1,"More is a wheel");
    assert(radial.frame.x>=0&&radial.frame.right<=width&&radial.frame.y>=0&&radial.frame.bottom<=height,"Wheel stays in viewport");
    for(const a of radial.targets){assert(a.width>=44&&a.height>=44,"Wheel touch target");for(const b of radial.targets){if(a===b)continue;assert(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y,"Wheel targets do not overlap");}}
    await page.keyboard.press("Escape");await menu.waitFor({state:"hidden"});assert(await more.evaluate(e=>e===document.activeElement),"More dismissal focus");
    results.push({width,height,label:"radial-wheel",...radial});
   };
   await auditWheel(1000);await auditWheel(520);await auditWheel(360);await page.setViewportSize({width,height:1000});
   await more.focus();await page.keyboard.press("ArrowDown");await menu.waitFor();await page.waitForFunction(()=>document.activeElement?.getAttribute("role")==="menuitem");await page.keyboard.press("ArrowDown");await page.waitForFunction(()=>document.activeElement?.textContent==="Usuários");assert(await menu.getByRole("menuitem",{name:"Usuários",exact:true}).evaluate(e=>e===document.activeElement),"Wheel roving keyboard focus");
   await page.keyboard.press("End");await page.waitForFunction(()=>document.activeElement?.getAttribute("aria-label")==="Fechar outras áreas");await page.keyboard.press("Enter");await menu.waitFor({state:"hidden"});await page.waitForFunction(()=>document.activeElement?.textContent==="Mais");assert(await more.evaluate(e=>e===document.activeElement),"Wheel central close returns focus");
   await more.click();await menu.waitFor();await menu.getByRole("menuitem",{name:"Consulta offline",exact:true}).click();await menu.waitFor({state:"hidden"});await page.waitForFunction(()=>document.getElementById("tadeon-main")===document.activeElement);
   await more.click();await menu.waitFor();await page.setViewportSize({width:820,height:1000});await menu.waitFor({state:"hidden"});await page.setViewportSize({width,height:1000});
   await page.emulateMedia({reducedMotion:"reduce"});await more.click();await menu.waitFor();assert(await menu.evaluate(e=>getComputedStyle(e).animationName)==="none","Wheel honors reduced motion");await menu.evaluate(e=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.waitForTimeout(100);await page.touchscreen.tap(4,150);await menu.waitFor({state:"hidden"});await page.emulateMedia({reducedMotion:"no-preference"});
   await opener.click();await drawer.waitFor();await page.setViewportSize({width:820,height:1000});await drawer.waitFor({state:"hidden"});await page.waitForFunction(() => document.querySelector('button[aria-controls="tadeon-mobile-navigation"]')?.getAttribute("aria-expanded") === "false" && document.getElementById("tadeon-main") === document.activeElement, undefined, {timeout:5000});await page.setViewportSize({width,height:1000});
  } else if(width>=768 && process.env.NEXUS_AUDIT_SCOPE !== "utilities") {
   await page.getByRole("button",{name:"Recolher menu",exact:true}).click();await page.waitForTimeout(250);const compact=page.locator("#tadeon-desktop-sidebar").getByRole("link",{name:"Usuários",exact:true});assert(await compact.isVisible(),"Collapsed destination keeps accessible label");
   const icon=await compact.locator(".tadeon-nav-item__icon").evaluate(e=>({width:e.getBoundingClientRect().width,opacity:getComputedStyle(e).opacity}));assert(icon.width>=16&&Number(icon.opacity)>0,"Collapsed icon remains visible");if(process.env.NEXUS_SKIP_SCREENSHOTS!=="1")await page.screenshot({path:`${root}/sidebar-${width}.png`});await page.getByRole("button",{name:"Expandir menu",exact:true}).click();await page.waitForTimeout(500);
   const nav=page.locator("#tadeon-desktop-sidebar").getByRole("link",{name:"Consulta offline",exact:true});const before=await nav.boundingBox();await nav.hover();await page.waitForTimeout(250);const after=await nav.boundingBox();assert(Math.abs(after.x-before.x)<.5&&Math.abs(after.y-before.y)<.5,`Navigation target stays still on hover: ${JSON.stringify({before,after,style:await nav.evaluate(e=>({transform:getComputedStyle(e).transform,translate:getComputedStyle(e).translate,scale:getComputedStyle(e).scale,animation:getComputedStyle(e).animationName}))})}`);
   const sidebar=page.locator('#tadeon-desktop-sidebar');
   const slide=await sidebar.evaluate(async e=>{
    const button=e.querySelector('.tadeon-sidebar-collapse'),frames=[];
    const expanded=e.getBoundingClientRect().width;button.click();
    await new Promise(resolve=>{const start=performance.now();function sample(now){frames.push(e.getBoundingClientRect().width);if(now-start<110)requestAnimationFrame(sample);else resolve();}requestAnimationFrame(sample);});
    button.click();await new Promise(resolve=>setTimeout(resolve,360));
    return {expanded,frames,settled:e.getBoundingClientRect().width,labels:e.querySelectorAll('.tadeon-nav-item__label').length};
   });
   assert(slide.frames.some(w=>w>82 && w<slide.expanded-2),'Sidebar traverses intermediate widths: '+JSON.stringify(slide));
   assert(Math.abs(slide.settled-slide.expanded)<1 && slide.labels>3,'Interrupted sidebar converges to expanded state');
   await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Recolher menu',exact:true}).click();
   assert(await sidebar.evaluate(e=>Math.abs(e.getBoundingClientRect().width-80)<1),'Reduced-motion sidebar settles immediately');
   await page.getByRole('button',{name:'Expandir menu',exact:true}).click();await page.emulateMedia({reducedMotion:'no-preference'});
   results.push({width,label:'sidebar-slide',...slide});

  }
  await page.emulateMedia({reducedMotion:"reduce"});
  if (process.env.NEXUS_AUDIT_SCOPE === "navigation") { await geometry("navigation"); await page.getByRole("button",{name:"Limpar cópia local",exact:true}).click();await page.getByRole("button",{name:"Cancelar",exact:true}).click();await context.close();continue; }
  await page.getByRole("searchbox").fill("cronista");assert(await page.getByText("O cronista",{exact:true}).isVisible(),"Offline search must match");assert(!(await page.getByText("A guardiã local",{exact:true}).count()),"Offline search filters");
  await page.getByRole("button",{name:"Limpar cópia local",exact:true}).click();await page.getByRole("button",{name:"Cancelar",exact:true}).click();
  await page.getByRole("searchbox").fill("");assert(await page.getByText("A guardiã local",{exact:true}).isVisible(),"Cancel must retain offline cache");
  await page.getByRole("button",{name:"Limpar cópia local",exact:true}).click();await page.getByRole("button",{name:"Limpar cópia",exact:true}).click();await page.getByText("Arquivo local ainda vazio",{exact:true}).waitFor();
  await geometry("offline-empty");
  await page.emulateMedia({reducedMotion:"no-preference"});
  const navSelector=width<768?'.tadeon-mobile-dock':'#tadeon-desktop-sidebar .tadeon-primary-nav';
  const settledPlate=async()=>{
   await page.waitForFunction(selector=>{
    const group=document.querySelector(selector),active=group?.querySelector('[aria-current="page"],[data-more-active="true"]'),plate=group?.querySelector('.tadeon-selection-plate');
    if(!active||!plate||group.querySelectorAll('[aria-current="page"],[data-more-active="true"]').length!==1)return false;const a=active.getBoundingClientRect(),p=plate.getBoundingClientRect();return Math.abs(a.x-p.x)<1&&Math.abs(a.y-p.y)<1&&Math.abs(a.width-p.width)<1&&Math.abs(a.height-p.height)<1;
   },navSelector,{timeout:10000});
  };
  await page.locator(navSelector).getByRole("link",{name:width<768?"Início":"Dashboard",exact:true}).click();
  await page.locator('#character-archive').waitFor();await settledPlate();
  if(width<768){await page.getByRole("button",{name:"Mais",exact:true}).click();await page.getByRole("menuitem",{name:"Usuários",exact:true}).click();}
  else await page.locator(navSelector).getByRole("link",{name:"Usuários",exact:true}).click();
  await page.getByText("Cronista",{exact:true}).waitFor();await settledPlate();
  await geometry("navigation-travel");await page.emulateMedia({reducedMotion:"reduce"});
await page.getByText("Cronista",{exact:true}).waitFor();
  assert(listCount>0,"Users must come from mocked server-function transport");await geometry("users");
  if(process.env.NEXUS_EXPECT_UTILITY_REGISTERS === "1") {
   const roles=await page.locator('.tadeon-user-row__access [role="combobox"]').evaluateAll(items=>items.map(e=>{const text=e.querySelector('span'),icon=e.querySelector('svg'),range=document.createRange();range.selectNodeContents(text);const r=range.getBoundingClientRect();return {text:e.textContent,fits:r.width<=text.getBoundingClientRect().width+1 && r.right<=icon.getBoundingClientRect().left+1};}));
   assert(roles.length===3 && roles.every(e=>e.fits),'Full role names fit: '+JSON.stringify(roles));
   await page.emulateMedia({reducedMotion:'no-preference'});
   const row=page.locator('.tadeon-user-row').last();await row.hover();
   assert(await row.evaluate(e=>{const c=getComputedStyle(e);return c.transform==='none' && c.filter==='none';}),'Directory rows stay still while operating controls');
   await page.emulateMedia({reducedMotion:'reduce'});
   results.push({width,label:'directory-contract',roles});
  }
  assert(results.findLast(result=>result.label==="users").rows.every(r=>r.inside && (width>=768 || r.height<220)),"Compact user rows stay readable without forced giant heights");
  await page.getByRole("searchbox").fill("cronista@");assert(!(await page.getByText(people[1].full_name,{exact:true}).count()),"User search filters name/email");
  await page.getByRole("searchbox").fill("none");await page.getByRole("button",{name:"Limpar filtros"}).click();
  const playerRole=page.getByRole("combobox",{name:`Papel de ${people[1].full_name}`});await playerRole.click();await page.getByRole("option",{name:"Mestre",exact:true}).click();await page.getByRole("alertdialog").waitFor();await geometry("users-role-review");await page.getByRole("button",{name:"Cancelar",exact:true}).click();
  assert(await playerRole.innerText()==="Jogador","Cancel role change preserves original role");
  usersError=true;await page.getByRole("button",{name:"Atualizar lista"}).click();await page.getByText("Não foi possível carregar os usuários.",{exact:true}).waitFor();await geometry("users-error");usersError=false;await page.getByRole("button",{name:"Tentar novamente",exact:true}).click();await page.getByText("Cronista",{exact:true}).waitFor();
  await page.goto(`http://127.0.0.1:${port}/nexus-tools`);await page.getByRole("heading",{name:"Backup e diagnóstico",level:1}).waitFor();
  await page.getByText("Nenhum ponto de restauração criado neste navegador.",{exact:true}).waitFor();await geometry("backup-empty");
  await page.getByLabel("Nome do ponto de restauração").fill("Antes da sessão de exemplo");await page.getByRole("button",{name:"Criar ponto",exact:true}).click();await page.getByText("Antes da sessão de exemplo",{exact:true}).waitFor();
  await page.getByRole("button",{name:"Revisar cópia",exact:true}).click();await page.getByRole("alertdialog").waitFor();await geometry("backup-review");await page.getByRole("button",{name:"Cancelar",exact:true}).click();
  const download=page.waitForEvent("download");await page.getByRole("button",{name:"Baixar ponto",exact:true}).click();const file=await download;assert(file.suggestedFilename().endsWith(".json"),"Backup download filename");
  await page.locator('input[type="file"]').setInputFiles({name:"invalid.json",mimeType:"application/json",buffer:Buffer.from('{"app":"Other"}')});assert(!(await page.getByRole("alertdialog").count()),"Invalid imports never reach merge review");
  await page.getByRole("button",{name:"Excluir ponto",exact:true}).click();await page.getByRole("button",{name:"Cancelar",exact:true}).click();assert(await page.getByText("Antes da sessão de exemplo",{exact:true}).isVisible(),"Cancel keeps snapshot");
  await page.getByRole("tab",{name:"Diagnóstico",exact:true}).click();await page.getByRole("button",{name:"Verificar novamente"}).waitFor();await geometry("diagnostics");
  assert(writes===0,"Utility verification must never write a production backend");await context.close();
 }
} finally {writeFileSync(`${root}/results.json`,JSON.stringify(results,null,2));await browser.close();try{process.kill(-server.pid,"SIGTERM");}catch{/*already stopped*/}}
