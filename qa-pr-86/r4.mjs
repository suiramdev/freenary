const shotDir = new URL("./shots/", import.meta.url).pathname;
export default async (page) => { page.setDefaultTimeout(30000);
  const f = encodeURIComponent(JSON.stringify([{ field: "category", operator: "isAnyOf", values: ["subscriptions", "transport-travel"] }]));
  const url = `http://localhost:3101/budget/transactions?view=categories&filters=${f}`;
  const card = () => page.locator("[data-slot=card]").filter({ has: page.locator(".recharts-pie-sector") }).first();
  const subVisible = async () => { const sub = page.locator("ul[aria-label]").filter({ has: page.locator("button") }).first(); const vp = card().locator("[data-slot=scroll-area-viewport]").first(); const a = await sub.boundingBox(); const b = await vp.boundingBox(); return a && b ? `sub top=${Math.round(a.y)} bottom=${Math.round(a.y + a.height)}; viewport ${Math.round(b.y)}-${Math.round(b.y + b.height)}; fullyVisible=${a.y >= b.y && a.y + a.height <= b.y + b.height}` : "n/a"; };
  for (const w of [1280, 1440, 1920]) { await page.setViewportSize({ width: w, height: 1000 }); await page.goto(url, { waitUntil: "domcontentloaded" }); await page.waitForSelector(".recharts-pie-sector"); await page.waitForTimeout(2000); console.log(`viewport ${w}: ${await subVisible()}`); await card().screenshot({ path: shotDir + `real-other-open-${w}.png` }); }
  await page.context().addCookies([{ name: "PARAGLIDE_LOCALE", value: "fr", url: "http://localhost:3101" }]);
  await page.emulateMedia({ colorScheme: "dark" }); await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url, { waitUntil: "domcontentloaded" }); await page.waitForSelector(".recharts-pie-sector"); await page.waitForTimeout(2500);
  console.log("dark class:", await page.evaluate(() => document.documentElement.className));
  console.log("legend fr:", (await card().locator("ul > li > button").allInnerTexts()).map((c) => c.replace(/\s+/g, " ")).join(" | "));
  console.log("sub aria-label:", await page.locator("ul[aria-label]").filter({ has: page.locator("button") }).first().getAttribute("aria-label"));
  await page.locator("ul[aria-label]").filter({ has: page.locator("button") }).first().scrollIntoViewIfNeeded(); await card().screenshot({ path: shotDir + "real-fr-dark-other-open.png" });
};
