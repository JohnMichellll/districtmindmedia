import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "https://district-mind-media.pages.dev";
const routes = ["/","/newsroom.html","/artists.html","/releases.html","/local.html","/wayfinder.html","/radar.html","/culture.html","/about.html","/contact.html","/academy.html","/academy-001.html","/editorial.html","/editorial-policy.html","/contributors.html","/explore.html","/article.html","/john-michell.html"];
const results = [];
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:390,height:844}, deviceScaleFactor:2});

page.on("console", m => { if (m.type()==="error") results.push({type:"console-error", text:m.text(), url:page.url()}); });
page.on("pageerror", e => results.push({type:"page-error", text:e.message, url:page.url()}));

for (const route of routes) {
  const url = BASE + route;
  const started = Date.now();
  try {
    const response = await page.goto(url,{waitUntil:"domcontentloaded",timeout:20000});
    await page.waitForTimeout(900);
    // Let artwork loaders settle before counting a tile as pending. Keep the cap
    // bounded so a slow third-party catalog cannot stall the whole audit.
    await page.waitForFunction(() => {
      const nodes = [...document.querySelectorAll("[data-photo-key],[data-release-artist][data-release-title],[data-image-status]")];
      return nodes.length === 0 || nodes.every(n => !["loading","unreported"].includes(n.dataset.imageStatus || "unreported"));
    }, { timeout: 6500 }).catch(() => {});
    const status = response?.status() ?? 0;
    const data = await page.evaluate(() => {
      const text = document.body?.innerText || "";
      const imgs = [...document.images].map(i=>({src:i.currentSrc||i.src,loaded:i.complete && i.naturalWidth>0,alt:i.alt||""}));
      const visualAssets = [...document.querySelectorAll("[data-photo-key],[data-release-artist],[data-image-status]")].map(n=>({key:n.dataset.photoKey||[n.dataset.releaseArtist,n.dataset.releaseTitle].filter(Boolean).join(" — ")||n.className,status:n.dataset.imageStatus||"unreported",loader:n.dataset.imageLoader||""}));
      const links = [...document.querySelectorAll("a[href]")].map(a=>a.href);
      const badWords = /(lorem ipsum|coming soon|undefined|null|null|null|TODO|placeholder)/i;
      return {
        title: document.title,
        bodyChars: text.trim().length,
        hasNav: !!document.querySelector("nav,header"),
        images: imgs,
        visualAssets,
        missingImageAlt: imgs.filter(i=>i.src && !i.alt.trim()).length,
        links,
        badCopy: badWords.test(text),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 4
      };
    });
    const internalLinks = [...new Set(data.links.filter(h=>h.startsWith(BASE)))];
    results.push({route,status,ms:Date.now()-started,...data,internalLinkCount:internalLinks.length});
  } catch (e) {
    results.push({route,error:e.message,ms:Date.now()-started});
  }
}
await browser.close();

const report = {
  generatedAt:new Date().toISOString(),
  target:BASE,
  viewport:"390x844",
  routes:results,
  summary:{
    routeFailures:results.filter(r=>r.route && r.status!==200).length,
    pageErrors:results.filter(r=>r.type==="page-error").length,
    consoleErrors:results.filter(r=>r.type==="console-error").length,
    blankPages:results.filter(r=>r.bodyChars!==undefined && r.bodyChars<200).length,
    horizontalOverflow:results.filter(r=>r.horizontalOverflow).length,
    brokenImages:results.reduce((n,r)=>n+(r.images||[]).filter(i=>!i.loaded).length,0),
    failedVisualAssets:results.reduce((n,r)=>n+(r.visualAssets||[]).filter(i=>i.status==="failed").length,0),
    pendingVisualAssets:results.reduce((n,r)=>n+(r.visualAssets||[]).filter(i=>i.status==="loading"||i.status==="unreported").length,0),
    missingImageAlt:results.reduce((n,r)=>n+(r.missingImageAlt||0),0),
    suspiciousCopy:results.filter(r=>r.badCopy).length
  }
};
fs.mkdirSync("reports",{recursive:true});
fs.writeFileSync("reports/first-impression-qa-latest.json",JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if (report.summary.routeFailures || report.summary.blankPages || report.summary.horizontalOverflow || report.summary.brokenImages || report.summary.failedVisualAssets || report.summary.pendingVisualAssets || report.summary.missingImageAlt || report.summary.suspiciousCopy || report.summary.pageErrors || report.summary.consoleErrors) process.exitCode=1;
