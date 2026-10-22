const shotDir = new URL("./shots/", import.meta.url).pathname;
export default async (page) => { page.setDefaultTimeout(20000);
  const log = console.log;
  const card = () => page.locator("ul[class*=relative]").first().locator("xpath=ancestor::*[contains(@class,'rounded')][1]");
  const sectors = () => page.locator(".recharts-pie-sector path");
  const sectorPoint = (i) => sectors().nth(i).evaluate((el) => { const svg = el.ownerSVGElement.getBoundingClientRect(); const cx = +el.getAttribute("cx"), cy = +el.getAttribute("cy"); const len = el.getTotalLength(); let maxd = 0; for (let f = 0; f < 1; f += 0.01) { const q = el.getPointAtLength(len * f); maxd = Math.max(maxd, Math.hypot(q.x - cx, q.y - cy)); } const pts = []; for (let f = 0; f < 1; f += 0.005) { const q = el.getPointAtLength(len * f); if (Math.hypot(q.x - cx, q.y - cy) > maxd - 1) pts.push(q); } const mid = pts[Math.floor(pts.length / 2)]; return { x: svg.left + cx + (mid.x - cx) * 0.8, y: svg.top + cy + (mid.y - cy) * 0.8 }; });
  const clickSector = async (i) => { const p = await sectorPoint(i); await page.mouse.click(p.x, p.y); await page.waitForTimeout(2500); };
  const tooltipOf = async (i) => { const p = await sectorPoint(i); await page.mouse.move(p.x, p.y); await page.waitForTimeout(400); return (await page.locator(".recharts-tooltip-wrapper").innerText()).replace(/\s+/g, " "); };
  const other = () => page.locator("ul[class*=relative] > li > button").filter({ hasText: /^(Other|Autres) \(\d+\)/ });
  const facts = async (label) => {
    const top = await page.locator("ul[class*=relative] > li > button").allInnerTexts();
    const sub = await page.locator("ul[aria-label] button").allInnerTexts();
    const pressed = await page.locator("ul[class*=relative] button[aria-pressed=true]").allInnerTexts();
    const op = await sectors().evaluateAll((els) => els.map((e) => e.getAttribute("fill-opacity")).join(","));
    const out = await page.getByRole("button", { name: /^(Outgoing|Sorties|Dépenses)/ }).first().innerText().catch(() => "?");
    const search = await page.getByPlaceholder(/Search and filter|Rechercher/).first().evaluate((e) => e.closest("div")?.parentElement?.innerText?.replace(/\s+/g, " ").slice(0, 200)).catch(() => "?");
    log(`\n## ${label}\nslices=${await sectors().count()} opacity=${op}\nlegend=[${top.map((c) => c.replace(/\s+/g, " ")).join(" | ")}]\nsub=[${sub.map((c) => c.replace(/\s+/g, " ")).join(" | ")}]\npressed=[${pressed.map((c) => c.replace(/\s+/g, " ")).join(" | ")}]\nlist outgoing=${out}\nfilter bar=${search}`);
  };
  const openCats = async (q = "") => { await page.goto(`http://localhost:3101/budget/transactions${q}`, { waitUntil: "domcontentloaded" }); await page.getByRole("button", { name: /^(Categories|Catégories)$/ }).click(); await page.waitForSelector(".recharts-pie-sector"); await page.waitForTimeout(1500); };
  await openCats(); log("url:", page.url()); await facts("real 1M"); await page.screenshot({ path: shotDir + "real-1m.png" });
  for (let i = 0; i < await sectors().count(); i++) log(`tooltip[${i}] ${await tooltipOf(i)}`);
  await clickSector((await sectors().count()) - 1); await facts("real: click Other slice"); log("url:", page.url()); await page.screenshot({ path: shotDir + "real-other-open.png" });
  await clickSector((await sectors().count()) - 1); await facts("real: click Other slice again");
  if (await other().count()) { await other().click(); await page.waitForTimeout(2500); await facts("real: click Other chip");
    const firstSub = page.locator("ul[aria-label] button").first(); await firstSub.click(); await page.waitForTimeout(2500); await facts("real: click first sub-list item"); await page.screenshot({ path: shotDir + "real-sub-item.png" });
    await other().click(); await page.waitForTimeout(1500); await other().click(); await page.waitForTimeout(2500); await facts("real: Other twice (expect cleared)"); }
  for (const r of ["3M", "1Y"]) { await page.getByRole("button", { name: r, exact: true }).click(); await page.waitForTimeout(6000); await facts(`real ${r}`); await page.screenshot({ path: shotDir + `real-${r}.png` }); }
};
