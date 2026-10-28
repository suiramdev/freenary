import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});

const BROWSER_GLOBALS = {
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver,
  Node: dom.window.Node,
  document: dom.window.document,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  localStorage: dom.window.localStorage,
  navigator: dom.window.navigator,
  window: dom.window,
};

beforeAll(() => {
  for (const [name, value] of Object.entries(BROWSER_GLOBALS)) {
    Object.defineProperty(globalThis, name, { configurable: true, value });
  }
});

afterAll(() => {
  for (const name of Object.keys(BROWSER_GLOBALS)) {
    Reflect.deleteProperty(globalThis, name);
  }
});

const renderBanner = async (latest: string | null) => {
  const { render } = await import("@testing-library/react/pure");
  const { UpdateBanner } = await import("./update-banner");

  return render(<UpdateBanner latest={latest} />);
};

describe("UpdateBanner", () => {
  it("names the release in a region with new-tab links and a dismiss button", async () => {
    localStorage.clear();
    const view = await renderBanner("1.3.0");

    const region = view.getByRole("region", {
      name: "Freenary v1.3.0 is available",
    });

    const links = [...region.querySelectorAll("a")].map((link) => ({
      href: link.getAttribute("href"),
      name: link.textContent,
      target: link.getAttribute("target"),
    }));

    expect(links).toEqual([
      {
        href: "https://github.com/suiramdev/freenary/releases/tag/v1.3.0",
        name: "Release notes(opens in a new tab)",
        target: "_blank",
      },
      {
        href: "https://freenary.dev/docs/1.3/run/updates-and-backups",
        name: "How to update(opens in a new tab)",
        target: "_blank",
      },
    ]);

    expect(
      view.getByRole("button", { name: "Dismiss the notice for v1.3.0" })
    ).toBeDefined();

    expect(region.getAttribute("role")).toBeNull();

    view.unmount();
  });

  it("shows nothing to a member or without a newer release", async () => {
    localStorage.clear();
    const view = await renderBanner(null);

    expect(view.queryByRole("region")).toBeNull();

    view.unmount();
  });

  it("stays dismissed for that release, and returns for a newer one", async () => {
    localStorage.clear();
    const { fireEvent } = await import("@testing-library/react/pure");
    const first = await renderBanner("1.3.0");

    fireEvent.click(
      first.getByRole("button", { name: "Dismiss the notice for v1.3.0" })
    );

    expect(first.queryByRole("region")).toBeNull();
    expect(localStorage.getItem("freenary.update.dismissed")).toBe("1.3.0");

    first.unmount();

    const reloaded = await renderBanner("1.3.0");

    expect(reloaded.queryByRole("region")).toBeNull();

    reloaded.unmount();

    const newer = await renderBanner("1.4.0");

    expect(
      newer.getByRole("region", { name: "Freenary v1.4.0 is available" })
    ).toBeDefined();

    newer.unmount();
  });
});
