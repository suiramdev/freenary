const dir = new URL("./shots87/", import.meta.url).pathname;
export default async (p) => { p.setDefaultTimeout(60000); await p.setViewportSize({ width: 1400, height: 1000 });
  for (const [loc, theme] of [["en", "light"], ["en", "dark"], ["fr", "light"]]) {
    await p.context().addCookies([{ name: "PARAGLIDE_LOCALE", value: loc, url: "http://localhost:3201" }]);
    await p.emulateMedia({ colorScheme: theme });
    await p.goto("http://localhost:3201/settings?section=budget", { waitUntil: "domcontentloaded" });
    await p.getByRole("button", { name: /^(Spending|Dépenses)$/ }).waitFor({ timeout: 90000 }); await p.waitForTimeout(1500);
    for (const g of [/^(Income|Revenus)$/, /^(Savings & investments|Épargne et placements|Savings and investments)$/, /^(Spending|Dépenses)$/]) { const b = p.getByRole("button", { name: g }); if (await b.count() && (await b.first().getAttribute("aria-expanded")) !== "true") await b.first().click(); await p.waitForTimeout(500); }
    const desc = await p.getByText(/Categories are grouped|Les catégories sont regroupées/).first().innerText();
    console.log(`\n## settings ${loc} ${theme}\ndesc: ${desc}`);
    if (!(loc === "fr")) {
      const rows = await p.evaluate(() => [...document.querySelectorAll("[class*='text-category-'],[class*='text-chart-']")].map((el) => { const row = el.closest("li,[role=row],[data-slot=item]") ?? el.parentElement; const label = (row?.innerText ?? "").split("\n")[0].trim(); const cls = (el.className.baseVal ?? el.className).match(/text-(category|chart)-[a-z-]+/)?.[0]; return `${label} | ${cls} | ${getComputedStyle(el).color} | op=${getComputedStyle(el).opacity}`; }));
      console.log(rows.join("\n"));
    }
    const card = p.locator("[data-slot=card]").filter({ hasText: /Categories are grouped|Les catégories sont regroupées/ }).first();
    await card.screenshot({ path: `${dir}settings-${loc}-${theme}.png` });
  }
};
