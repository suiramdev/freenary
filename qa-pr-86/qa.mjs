import { chromium } from "playwright-core";
const OUT = new URL("./shots/", import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: process.env.HOME + "/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome" });
const page = await browser.newPage({ viewport: { width: 1000, height: 440 }, deviceScaleFactor: 2 });
const log = (...a) => console.log(...a);
const open = async (q) => { await page.goto(`http://localhost:5884/?${q}`); await page.waitForSelector(".recharts-pie-sector"); await page.waitForTimeout(400); };
const filters = async () => (await page.getByTestId("filters").innerText()).split("\n\nsum")[0].replace(/\s+/g, " ").replace("page filters: ", "");
const sum = async () => (await page.getByTestId("filters").innerText()).split("sum of all categories: ")[1];
const sectors = () => page.locator(".recharts-pie-sector path");
const facts = async (label) => {
  const n = await sectors().count();
  const fills = await sectors().evaluateAll((els) => els.map((e) => `${getComputedStyle(e).fill}@${e.getAttribute("fill-opacity") ?? getComputedStyle(e).fillOpacity}`));
  const top = await page.locator("ul[class*=relative] > li > button").allInnerTexts();
  const sub = await page.locator("ul[aria-label] button").allInnerTexts();
  const pressed = await page.locator("button[aria-pressed=true]").allInnerTexts();
  log(`\n## ${label}\nslices=${n}\nlegend=[${top.map((c) => c.replace(/\s+/g, " ")).join(" | ")}]\nsub-list=[${sub.map((c) => c.replace(/\s+/g, " ")).join(" | ")}]\npressed=[${pressed.map((c) => c.replace(/\s+/g, " ")).join(" | ")}]\nfills=${fills.join(", ")}\nfilters=${await filters()}\nsum=${await sum()}`);
};
const shot = (name) => page.screenshot({ path: `${OUT}${name}.png`, fullPage: true });
const sectorPoint = (i) => sectors().nth(i).evaluate((el) => { const svg = el.ownerSVGElement.getBoundingClientRect(); const cx = +el.getAttribute("cx"), cy = +el.getAttribute("cy"); const len = el.getTotalLength(); let best = null; for (let f = 0; f < 1; f += 0.01) { const q = el.getPointAtLength(len * f); const d = Math.hypot(q.x - cx, q.y - cy); if (!best || d > best.d) best = { ...q, d }; } const mid = (() => { const pts = []; for (let f = 0; f < 1; f += 0.005) { const q = el.getPointAtLength(len * f); if (Math.hypot(q.x - cx, q.y - cy) > best.d - 1) pts.push(q); } return pts[Math.floor(pts.length / 2)]; })(); const x = cx + (mid.x - cx) * 0.8, y = cy + (mid.y - cy) * 0.8; return { x: svg.left + x, y: svg.top + y }; });
const hoverSector = async (i) => { const p = await sectorPoint(i); await page.mouse.move(p.x, p.y); };
const clickSector = async (i) => { const p = await sectorPoint(i); await page.mouse.click(p.x, p.y); };
const tooltipOf = async (i) => { await hoverSector(i); await page.waitForTimeout(300); return (await page.locator(".recharts-tooltip-wrapper").innerText()).replace(/\s+/g, " "); };
const other = () => page.locator("ul[class*=relative] > li > button").filter({ hasText: /^(Other|Autres) \(\d+\)/ });



await open("case=10"); await page.mouse.click(5, 5);
for (let i = 0; i < 12; i++) { await page.keyboard.press("Tab"); const t = await page.evaluate(() => document.activeElement?.innerText?.replace(/\s+/g, " ")); if (/^Other/.test(t ?? "")) { log(`\nkeyboard: Other focused after ${i + 1} Tab`); break; } }
await page.keyboard.press("Enter"); await page.waitForTimeout(300); await facts("keyboard Enter on Other"); await shot("kbd-enter");
await page.keyboard.press("Space"); await page.waitForTimeout(300); await facts("keyboard Space on Other");

await open("case=10&filter=entertainment"); await facts("page filter inside Other (entertainment)"); await shot("filter-inside-other");
await open("case=10&filter=groceries"); await facts("page filter on top-6 (groceries)");
await open("case=10-uncat"); await facts("uncat top6 (before #72)"); await shot("uncat-before72-light");
await open("case=10-uncat&after72"); await facts("uncat top6 after72 light"); await shot("uncat-after72-light");
await open("case=10-uncat&after72&theme=dark"); await facts("uncat top6 after72 dark"); await shot("uncat-after72-dark");
await open("case=10&locale=fr"); await facts("fr"); log(`tooltip fr ${await tooltipOf(6)}`); await other().click(); await page.waitForTimeout(300); await facts("fr Other open"); await shot("fr-other-open");
await browser.close();
