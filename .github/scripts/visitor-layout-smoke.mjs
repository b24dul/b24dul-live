// Offline geometry smoke test for B24DUL's existing visitor markup.
// Intentionally omits Firebase/module boot; this verifies CSS layout only.
import fs from "node:fs";
import { chromium } from "playwright";

const raw = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const html = raw.replace(/<script type="module">[\s\S]*?<\/script>/, "")
  .replace("</head>", `<style id="qa-css">${css}</style></head>`);
const browser = await chromium.launch({headless:true});
const widths = [320, 390, 768, 1024, 1280, 1600];
const sections = ["home", "games", "videos", "watch", "chat"];
const results = [];
let failed = false;
for (const width of widths) {
  const page = await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1});
  await page.route("**/*", route => route.abort());
  for (const section of sections) {
    await page.setContent(html, {waitUntil:"domcontentloaded"});
    await page.evaluate((section) => {
      const main = document.querySelector("main");
      main.dataset.visitorSection = section;
      main.dataset.mobileSection = section === "chat" ? "chat" : "content";
      const watch = section === "watch";
      const frame = document.querySelector("#playerFrame");
      frame.classList.toggle("offline", !watch);
      document.querySelector("#ytFrame").hidden = !watch;
      document.querySelector("#offline").hidden = watch;
      document.querySelector("#ofChoose").hidden = !["home","games"].includes(section);
      document.querySelector("#ofVideos").hidden = section !== "videos";
      document.querySelector("#of2048").hidden = true;
      document.querySelector("#ofGame").hidden = true;
      if (section === "videos") {
        const grid = document.querySelector("#vidGrid");
        grid.replaceChildren();
        for (let i = 0; i < 8; i++) {
          const b = document.createElement("button");
          b.className = "vid-card";
          b.innerHTML = '<div class="thumb"><span class="play">▶</span></div><span class="vt">Sample video title for responsive geometry assessment</span><span class="vd">17 Nov 2026</span>';
          grid.append(b);
        }
      }
    }, section);
    const result = await page.evaluate((section) => {
      const box = sel => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {top:+r.top.toFixed(1), bottom:+r.bottom.toFixed(1), left:+r.left.toFixed(1), right:+r.right.toFixed(1), width:+r.width.toFixed(1), height:+r.height.toFixed(1), visible:getComputedStyle(el).display !== "none"};
      };
      const width = window.innerWidth;
      const main = box("main"), frame = box("#playerFrame"), offline = box("#offline"), player = box("main > .player");
      const nav = box("#visitorNav");
      const videoGrid = box("#vidGrid");
      const scrollWidth = document.documentElement.scrollWidth;
      const issues = [];
      if (scrollWidth > width+2) issues.push(`document horizontal overflow ${scrollWidth} > ${width}`);
      if (section !== "chat" && section !== "watch") {
        if (main.bottom + 2 < frame.bottom) issues.push("main ends before frame");
        if (frame.bottom + 2 < offline.bottom) issues.push("frame ends before offline content");
      }
      if (section === "videos") {
        const cards = [...document.querySelectorAll("#vidGrid .vid-card")].map(e=>e.getBoundingClientRect());
        if (cards.some(r=>r.right > width+2 || r.left < -2)) issues.push("video card outside viewport");
        if (videoGrid && frame.bottom + 2 < videoGrid.bottom) issues.push("videos overflow frame");
      }
      if (section === "watch" && frame.height>0) {
        if (Math.abs(frame.width/frame.height - 16/9) > .08) issues.push("watch frame not 16:9");
      }
      if (section === "chat" && width<=760) {
        if (player.visible) issues.push("mobile chat shows player");
        if (!box("main > .chat").visible) issues.push("mobile chat hidden");
      }
      return {section,width,main,frame,offline,nav,videoGrid,scrollWidth,issues};
    }, section);
    results.push(result);
    console.log(JSON.stringify({section,width,issues:result.issues,mainBottom:result.main.bottom,frameBottom:result.frame.bottom,offlineBottom:result.offline.bottom,scrollWidth:result.scrollWidth}));
    if (result.issues.length) failed = true;
  }
  await page.close();
}
await browser.close();
fs.mkdirSync("qa-artifacts",{recursive:true});
fs.writeFileSync("qa-artifacts/layout-results.json", JSON.stringify(results,null,2));
if (failed) { console.error("Responsive layout smoke test FAILED"); process.exitCode=1; }
else console.log("Responsive layout smoke test PASS: "+results.length+" combinations.");
