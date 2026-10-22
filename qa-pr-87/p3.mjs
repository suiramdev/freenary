const dir = new URL("./shots87/", import.meta.url).pathname;
export default async (p) => { p.setDefaultTimeout(60000); await p.setViewportSize({ width: 1400, height: 1000 });
  await p.context().addCookies([{ name: "PARAGLIDE_LOCALE", value: "en", url: "http://localhost:3201" }]);
  for (const theme of ["light", "dark"]) {
    await p.emulateMedia({ colorScheme: theme });
    for (const range of ["1M", "3M", "1Y"]) {
      await p.goto("http://localhost:3201/budget/transactions?view=categories", { waitUntil: "domcontentloaded" });
      await p.waitForSelector(".recharts-pie-sector", { timeout: 90000 }); await p.waitForTimeout(1000);
      if (range !== "1M") { await p.getByRole("button", { name: range, exact: true }).click(); await p.waitForTimeout(5000); }
      const legend = await p.evaluate(() => [...document.querySelectorAll(".recharts-pie-sector path")].map((e) => getComputedStyle(e).fill));
      const chips = await p.locator("ul[class*=relative] > li > button").evaluateAll((els) => els.map((b) => `${b.innerText.replace(/\s+/g, " ").replace(/ [−-]?€[\d,.]+$/, "")}=${getComputedStyle(b.querySelector("span")).backgroundColor}`));
      console.log(`\n## donut ${theme} ${range}\n${chips.join("\n")}\nslice fills: ${legend.join(" ; ")}`);
      if (range === "1M") await p.locator("[data-slot=card]").filter({ has: p.locator(".recharts-pie-sector") }).first().screenshot({ path: `${dir}donut-${theme}-1M.png` });
    }
    await p.goto("http://localhost:3201/budget/transactions?view=flow", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(8000);
    const nodes = await p.evaluate(() => [...document.querySelectorAll(".recharts-sankey-node, .recharts-sankey-nodes g, svg rect")].map((r) => { const rect = r.tagName === "rect" ? r : r.querySelector("rect"); const t = (r.parentElement?.querySelector("text")?.textContent ?? r.querySelector?.("text")?.textContent ?? "").trim(); return rect ? `${t}=${rect.getAttribute("fill")}` : null; }).filter(Boolean).slice(0, 60));
    console.log(`\n## sankey ${theme}\n${[...new Set(nodes)].join("\n")}`);
    await p.locator("[data-slot=card]").filter({ hasText: /Spending Breakdown|Cash Flow/ }).first().screenshot({ path: `${dir}sankey-${theme}.png` });
    const rows = await p.evaluate(() => [...document.querySelectorAll("[class*='text-category-']")].slice(0, 400).map((el) => { const row = el.closest("[data-slot=item]") ?? el.closest("button"); const t = (row?.innerText ?? "").split("\n")[0].replace(/PAIEMENT CB \d+ | CARTE \d+/g, "").trim(); return `${(el.className.baseVal ?? el.className).match(/text-category-[a-z-]+/)[0]} ${t}`; }));
    const bySlot = {}; for (const r of rows) { const [s, ...n] = r.split(" "); (bySlot[s] ??= new Set()).add(n.join(" ")); }
    console.log(`\n## transaction chips ${theme}\n${Object.entries(bySlot).map(([s, n]) => `${s}: ${[...n].slice(0, 6).join(", ")}`).join("\n")}`);
    await p.goto("http://localhost:3201/budget/recurring", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(8000);
    const bc = p.getByRole("button", { name: /By category/ }); if (await bc.count()) { await bc.first().click(); await p.waitForTimeout(2000); }
    const rec = await p.evaluate(() => [...document.querySelectorAll("[style*='background-color']")].filter((e) => /category/.test(e.getAttribute("style"))).map((e) => `${(e.closest("li,tr,[data-slot=item]")?.innerText ?? e.parentElement.innerText).split("\n")[0]}=${e.getAttribute("style")}`));
    console.log(`\n## recurring ${theme}\n${[...new Set(rec)].join("\n")}`);
    await p.screenshot({ path: `${dir}recurring-${theme}.png` });
  }
};
