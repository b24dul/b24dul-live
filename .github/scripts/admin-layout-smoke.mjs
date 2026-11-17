// Phase 7: layout/accessibility smoke for the existing admin workspace.
// No Firebase/Admin credentials used. Mock DOM relocation only; security
// permission, RTDB writes, live stream controls need separate real E2E tests.
import fs from "node:fs";
import { chromium } from "playwright";
const source=fs.readFileSync("index.html","utf8");
const css=fs.readFileSync("styles.css","utf8");
const html=source.replace(/<script type="module">[\s\S]*?<\/script>/, "").replace("</head>", `<style>${css}</style></head>`);
const browser=await chromium.launch({headless:true});
const widths=[320,390,768,1024,1280,1600];
const results=[];let failed=false;
for(const width of widths){
  const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1});
  await page.route("**/*",r=>r.abort());
  await page.setContent(html,{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    document.body.classList.add("admin");
    const $=s=>document.querySelector(s);
    const slots=[
      ["#adminControlsSlot","#adminBar"],
      ["#adminAnalyticsSlot","#statsModal"],
      ["#adminInspectorSlot","#userPanel"],
      ["#adminChatSlot","main > .chat"],
      ["#adminPreviewSlot","main > .player"]
    ];
    for(const [slot,node] of slots){const a=$(slot),b=$(node);if(a&&b)a.append(b);}
    const frame=$("#playerFrame"); if(frame){frame.classList.add("offline");}
    const offline=$("#offline");if(offline)offline.hidden=true;
    const stats=$("#statsModal");if(stats)stats.hidden=false;
    // Avoid real Firebase; mock panel strings for visual containment.
    const chat=$("#messages");if(chat){chat.replaceChildren();for(let i=0;i<10;i++){const li=document.createElement("li");li.textContent="Sample moderation message "+(i+1);chat.append(li);}}
  });
  const r=await page.evaluate(width=>{
    const box=sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,display:getComputedStyle(e).display};};
    const doc=document.documentElement,selectors=["#adminWorkspace",".adm-intro",".adm-controls",".adm-grid",".adm-work",".adm-rail",".adm-chat-wrap",".adm-preview-wrap","#adminBar","#adminAnalyticsSlot","#adminInspectorSlot"];
    const bounds=Object.fromEntries(selectors.map(s=>[s,box(s)]));
    const errors=[];
    if(doc.scrollWidth>width+2){
      const offenders=[...document.querySelectorAll("body *")].map(el=>{
        const b=el.getBoundingClientRect();return {tag:el.tagName,selector:el.id?"#"+el.id:el.className&&typeof el.className==="string"?"."+el.className.trim().replace(/\\s+/g,"."):el.tagName,left:Math.round(b.left),right:Math.round(b.right),width:Math.round(b.width)};
      }).filter(b=>b.right>width+3||b.left< -3).sort((a,b)=>b.right-a.right).slice(0,14);
      errors.push("document overflows horizontally: "+doc.scrollWidth+" > "+width+" offenders="+JSON.stringify(offenders));
    }
    if(!bounds["#adminWorkspace"]||bounds["#adminWorkspace"].display==="none")errors.push("admin workspace hidden");
    for(const [sel,r] of Object.entries(bounds)){
      if(!r)errors.push("missing "+sel);
      else if(r.display!=="none"&&(r.left< -2 ||r.right>width+2))errors.push("offscreen panel "+sel+" "+r.left+".."+r.right);
    }
    for(const sel of ["#adminControlsSlot","#adminAnalyticsSlot","#adminInspectorSlot","#adminChatSlot","#adminPreviewSlot"]){
      const node=document.querySelector(sel);if(!node ||!node.children.length)errors.push("missing admin widget relocation "+sel);
    }
    const ids=[...document.querySelectorAll("[id]")].map(n=>n.id);
    if(new Set(ids).size!==ids.length)errors.push("duplicate html ids");
    return {width,docScrollWidth:doc.scrollWidth,bounds,errors};
  },width);
  results.push(r);if(r.errors.length)failed=true;
  console.log(JSON.stringify({width,scrollWidth:r.docScrollWidth,errors:r.errors}));
  await page.close();
}
await browser.close();
fs.mkdirSync("qa-artifacts",{recursive:true});
fs.writeFileSync("qa-artifacts/admin-layout-results.json",JSON.stringify(results,null,2));
if(failed){console.error("Admin geometry FAIL");process.exitCode=1}
else console.log("Admin geometry PASS: "+results.length+" widths");
