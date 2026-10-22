const dir = new URL("./shots87/", import.meta.url).pathname;
const SLOTS = ["blue","blue-alt","orange","orange-alt","teal","teal-alt","pink","pink-alt","purple","purple-alt","yellow","yellow-alt","green","green-alt","brown","brown-alt","grey"];
export default async (p) => { p.setDefaultTimeout(60000); await p.setViewportSize({ width: 1400, height: 1000 });
  for (const theme of ["light", "dark"]) {
    await p.emulateMedia({ colorScheme: theme });
    await p.goto("http://localhost:3201/budget/transactions?view=categories", { waitUntil: "domcontentloaded" }); await p.waitForSelector(".recharts-pie-sector", { timeout: 90000 }); await p.waitForTimeout(1500);
    const trig = p.locator("button").filter({ hasText: /^(Fixed vs\. variable|Budget vs\. actual)$/ }).first(); console.log("trigger:", await trig.innerText()); await trig.click(); await p.waitForTimeout(800);
    console.log("menu:", (await p.locator("[role=menu],[role=listbox]").allInnerTexts()).join(" / "));
    await p.getByRole("menuitemradio", { name: /Budget vs\. actual/ }).or(p.getByRole("menuitem", { name: /Budget vs\. actual/ })).or(p.getByRole("option", { name: /Budget vs\. actual/ })).or(p.getByText("Budget vs. actual", { exact: true })).first().click(); await p.waitForTimeout(3000);
    const bva = p.locator("[data-slot=card]").filter({ hasText: /Budget vs\. actual/ }).first();
    console.log(`\n## bva ${theme}\n` + (await bva.innerText()).replace(/\n/g, " | ").slice(0, 600));
    const fills = await bva.evaluate((c) => [...c.querySelectorAll("[style*='background'], rect, path")].map((e) => (e.getAttribute("style") ?? "") + " fill=" + (e.getAttribute("fill") ?? "")).filter((s) => /category|destructive|chart/.test(s)));
    console.log(fills.join("\n"));
    await p.locator("[data-slot=card]").filter({ has: p.locator(".recharts-pie-sector") }).first().locator("xpath=..").screenshot({ path: `${dir}donut-bva-${theme}.png` });
    const res = await p.evaluate((slots) => {
      const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true });
      const rgb = (css) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = css; cx.fillRect(0, 0, 1, 1); return [...cx.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
      const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
      const probe = document.createElement("div"); document.body.append(probe);
      const resolve = (v) => { probe.style.color = `var(${v})`; return getComputedStyle(probe).color; };
      const card = rgb(resolve("--card")); const destr = rgb(resolve("--destructive"));
      return { card: resolve("--card"), destructive: resolve("--destructive"), rows: slots.map((s) => { const c = rgb(resolve(`--category-${s}`)); const d = Math.hypot(...c.map((v, i) => v - destr[i])); return `${s}: ${resolve(`--category-${s}`)} rgb(${c}) contrast=${cr(c, card).toFixed(2)} distToDestructive=${d.toFixed(0)}`; }), pairs: ["blue","orange","teal","pink","purple","yellow","green","brown"].map((h) => `${h} vs ${h}-alt: ${cr(rgb(resolve(`--category-${h}`)), rgb(resolve(`--category-${h}-alt`))).toFixed(2)}:1`) };
    }, SLOTS);
    console.log(`\n## contrast ${theme} card=${res.card} destructive=${res.destructive}\n${res.rows.join("\n")}\n${res.pairs.join("\n")}`);
  }
};
